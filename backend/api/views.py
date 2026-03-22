import hashlib
import io
import mimetypes
import os
import zipfile
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import StoredFile, FileUpload, Tag, Folder, FileIndex
from .serializers import FileUploadSerializer, StoredFileFlatSerializer, StoredFileWithUploadsSerializer, TagSerializer, FolderSerializer


DOCUMENT_MIMES = {
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}
ARCHIVE_MIMES = {
    "application/zip", "application/x-tar", "application/gzip",
    "application/x-7z-compressed", "application/x-rar-compressed",
    "application/x-bzip2",
}

def get_file_category(mime_type):
    if not mime_type:
        return "other"
    if mime_type.startswith("image/"):
        return "image"
    if mime_type.startswith("video/"):
        return "video"
    if mime_type.startswith("audio/"):
        return "audio"
    if mime_type in DOCUMENT_MIMES:
        return "document"
    if mime_type in ARCHIVE_MIMES:
        return "archive"
    if mime_type.startswith("text/"):
        return "code"
    return "other"


def compute_sha256_and_save(uploaded_file):
    hasher = hashlib.sha256()
    total_size = 0

    storage_dir = os.path.join(settings.MEDIA_ROOT, "storage")
    os.makedirs(storage_dir, exist_ok=True)

    chunks = []
    for chunk in uploaded_file.chunks():
        hasher.update(chunk)
        total_size += len(chunk)
        chunks.append(chunk)

    sha256 = hasher.hexdigest()
    storage_path = os.path.join(storage_dir, sha256)

    if not os.path.exists(storage_path):
        with open(storage_path, "wb") as f:
            for chunk in chunks:
                f.write(chunk)

    return sha256, total_size, storage_path


MAX_TEXT_BYTES = 512 * 1024  # 512 KB


def extract_text(storage_path, mime_type):
    try:
        if mime_type.startswith("text/") or mime_type in {
            "application/json", "application/javascript", "application/xml"
        }:
            with open(storage_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read(MAX_TEXT_BYTES)

        if mime_type == "application/pdf":
            from pdfminer.high_level import extract_text as pdf_extract
            text = pdf_extract(storage_path)
            return text[:MAX_TEXT_BYTES] if text else ""

    except Exception:
        pass
    return ""


class UploadFileView(APIView):
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        from django.db.models import Sum
        from .models import UserProfile
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        used_bytes = FileUpload.objects.filter(user=request.user).aggregate(
            total=Sum("stored_file__size_bytes")
        )["total"] or 0
        file_size = uploaded_file.size
        if used_bytes + file_size > profile.quota_bytes:
            quota_mb = profile.quota_bytes // (1024 ** 2)
            return Response(
                {"error": f"Storage quota exceeded. Your limit is {quota_mb} MB."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        sha256, size_bytes, storage_path = compute_sha256_and_save(uploaded_file)

        mime_type, _ = mimetypes.guess_type(uploaded_file.name)
        mime_type = mime_type or "application/octet-stream"

        stored, created = StoredFile.objects.get_or_create(
            sha256=sha256,
            defaults={
                "size_bytes": size_bytes,
                "storage_path": storage_path,
                "mime_type": mime_type,
                "ref_count": 1,
            }
        )

        if not created:
            # File already exists, increment reference count
            stored.ref_count += 1
            stored.save()

        upload = FileUpload.objects.create(
            user=request.user,
            original_name=uploaded_file.name,
            stored_file=stored
        )

        content_text = extract_text(storage_path, mime_type)
        FileIndex.objects.create(upload=upload, content_text=content_text)

        return Response(FileUploadSerializer(upload).data, status=status.HTTP_201_CREATED)


class ListFilesView(APIView):
    def get(self, request):
        try:
            q = request.query_params.get("q", "").strip()
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = max(1, min(100, int(request.query_params.get("page_size", 10))))
            order = request.query_params.get("order", "-uploaded_at")
            allowed_orders = {
                "uploaded_at": "uploaded_at",
                "-uploaded_at": "-uploaded_at",
                "original_name": "original_name",
                "-original_name": "-original_name",
                "size": "stored_file__size_bytes",
                "-size": "-stored_file__size_bytes",
            }
            order_by = allowed_orders.get(order, "-uploaded_at")

            search_mode = request.query_params.get("search_mode", "filename")
            uploads = FileUpload.objects.select_related("stored_file").filter(user=request.user).order_by(order_by)

            if q:
                if search_mode == "content":
                    uploads = uploads.filter(index__content_text__icontains=q)
                else:
                    uploads = uploads.filter(original_name__icontains=q)

            file_type = request.query_params.get("file_type", "").strip()
            if file_type:
                matching_mimes = [
                    m for m in (
                        list(DOCUMENT_MIMES) if file_type == "document" else
                        list(ARCHIVE_MIMES) if file_type == "archive" else []
                    )
                ]
                if file_type in ("image", "video", "audio", "code"):
                    prefix_map = {"image": "image/", "video": "video/", "audio": "audio/", "code": "text/"}
                    uploads = uploads.filter(stored_file__mime_type__startswith=prefix_map[file_type])
                elif matching_mimes:
                    uploads = uploads.filter(stored_file__mime_type__in=matching_mimes)
                elif file_type == "other":
                    all_known = list(DOCUMENT_MIMES) + list(ARCHIVE_MIMES)
                    uploads = uploads.exclude(stored_file__mime_type__startswith="image/") \
                                     .exclude(stored_file__mime_type__startswith="video/") \
                                     .exclude(stored_file__mime_type__startswith="audio/") \
                                     .exclude(stored_file__mime_type__startswith="text/") \
                                     .exclude(stored_file__mime_type__in=all_known)

            date_from = request.query_params.get("date_from", "").strip()
            date_to = request.query_params.get("date_to", "").strip()
            if date_from:
                uploads = uploads.filter(uploaded_at__date__gte=date_from)
            if date_to:
                uploads = uploads.filter(uploaded_at__date__lte=date_to)

            size_min = request.query_params.get("size_min", "").strip()
            size_max = request.query_params.get("size_max", "").strip()
            if size_min:
                uploads = uploads.filter(stored_file__size_bytes__gte=int(size_min))
            if size_max:
                uploads = uploads.filter(stored_file__size_bytes__lte=int(size_max))

            folder_param = request.query_params.get("folder", "").strip()
            if folder_param == "none":
                uploads = uploads.filter(folder__isnull=True)
            elif folder_param:
                uploads = uploads.filter(folder__id=folder_param)

            total = uploads.count()
            start = (page - 1) * page_size
            end = start + page_size
            uploads_page = uploads[start:end]

            serializer = FileUploadSerializer(uploads_page, many=True)
            return Response({
                "results": serializer.data,
                "count": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size if total else 1,
            }, status=status.HTTP_200_OK)
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid page or page_size"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ListStoredFilesView(APIView):
    def get(self, request):
        stored = StoredFile.objects.all().order_by("-created_at")
        return Response(StoredFileFlatSerializer(stored, many=True).data)


class DuplicatesView(APIView):
    def get(self, request):
        user_stored_ids = FileUpload.objects.filter(user=request.user).values_list("stored_file_id", flat=True)
        dupes = StoredFile.objects.filter(id__in=user_stored_ids, ref_count__gt=1).prefetch_related("uploads").order_by("-ref_count")
        return Response(StoredFileWithUploadsSerializer(dupes, many=True).data)


class TagView(APIView):
    def get(self, request):
        tags = Tag.objects.filter(user=request.user)
        return Response(TagSerializer(tags, many=True).data)

    def post(self, request):
        name = request.data.get("name", "").strip()
        color = request.data.get("color", "#3b82f6").strip()
        if not name:
            return Response({"error": "Tag name is required"}, status=status.HTTP_400_BAD_REQUEST)
        if Tag.objects.filter(user=request.user, name__iexact=name).exists():
            return Response({"error": "Tag already exists"}, status=status.HTTP_400_BAD_REQUEST)
        tag = Tag.objects.create(user=request.user, name=name, color=color)
        return Response(TagSerializer(tag).data, status=status.HTTP_201_CREATED)

    def delete(self, request, tag_id):
        try:
            tag = Tag.objects.get(id=tag_id, user=request.user)
            tag.delete()
            return Response({"message": "Tag deleted"}, status=status.HTTP_200_OK)
        except Tag.DoesNotExist:
            return Response({"error": "Tag not found"}, status=status.HTTP_404_NOT_FOUND)


class FileTagView(APIView):
    def post(self, request, upload_id):
        try:
            upload = FileUpload.objects.get(id=upload_id, user=request.user)
            tag_id = request.data.get("tag_id")
            tag = Tag.objects.get(id=tag_id, user=request.user)
            upload.tags.add(tag)
            return Response(FileUploadSerializer(upload).data)
        except (FileUpload.DoesNotExist, Tag.DoesNotExist) as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, upload_id, tag_id):
        try:
            upload = FileUpload.objects.get(id=upload_id, user=request.user)
            tag = Tag.objects.get(id=tag_id, user=request.user)
            upload.tags.remove(tag)
            return Response({"message": "Tag removed"}, status=status.HTTP_200_OK)
        except (FileUpload.DoesNotExist, Tag.DoesNotExist) as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)


class BulkDeleteView(APIView):
    def delete(self, request):
        ids = request.data.get("ids", [])
        if not ids:
            return Response({"error": "No IDs provided"}, status=status.HTTP_400_BAD_REQUEST)

        deleted = 0
        errors = []
        for upload_id in ids:
            try:
                upload = FileUpload.objects.select_related("stored_file").get(id=upload_id, user=request.user)
                stored_file = upload.stored_file
                upload.delete()
                stored_file.ref_count -= 1
                stored_file.save()
                if stored_file.ref_count <= 0:
                    if os.path.exists(stored_file.storage_path):
                        os.remove(stored_file.storage_path)
                    stored_file.delete()
                deleted += 1
            except FileUpload.DoesNotExist:
                errors.append({"id": upload_id, "error": "Not found"})
            except Exception as e:
                errors.append({"id": upload_id, "error": str(e)})

        return Response({"deleted": deleted, "errors": errors}, status=status.HTTP_200_OK)


class BulkDownloadZipView(APIView):
    def post(self, request):
        ids = request.data.get("ids", [])
        if not ids:
            return Response({"error": "No IDs provided"}, status=status.HTTP_400_BAD_REQUEST)

        uploads = FileUpload.objects.select_related("stored_file").filter(id__in=ids, user=request.user)
        if not uploads.exists():
            return Response({"error": "No matching uploads"}, status=status.HTTP_404_NOT_FOUND)

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            seen_names = {}
            for upload in uploads:
                path = upload.stored_file.storage_path
                if not os.path.exists(path):
                    continue
                name = upload.original_name
                if name in seen_names:
                    seen_names[name] += 1
                    base, ext = os.path.splitext(name)
                    name = f"{base}_{seen_names[name]}{ext}"
                else:
                    seen_names[name] = 0
                zf.write(path, name)

        buf.seek(0)
        response = HttpResponse(buf.read(), content_type="application/zip")
        response["Content-Disposition"] = 'attachment; filename="vault-export.zip"'
        return response


class DownloadByUploadIdView(APIView):
    def get(self, request, upload_id):
        try:
            upload = FileUpload.objects.select_related("stored_file").get(id=upload_id, user=request.user)
        except FileUpload.DoesNotExist:
            raise Http404("Upload not found")

        path = upload.stored_file.storage_path
        if not os.path.exists(path):
            raise Http404("Stored file missing")

        as_attachment = request.query_params.get("download", "0") != "0"
        file_handle = open(path, "rb")
        mime = upload.stored_file.mime_type or "application/octet-stream"
        response = FileResponse(file_handle, content_type=mime, as_attachment=as_attachment, filename=upload.original_name)
        return response


class StatsView(APIView):
    def get(self, request):
        try:
            from django.db.models import Sum, Count
            from .models import UserProfile
            user_uploads = FileUpload.objects.filter(user=request.user)
            total_uploads = user_uploads.count()
            user_stored_ids = user_uploads.values_list("stored_file_id", flat=True)
            total_stored = StoredFile.objects.filter(id__in=user_stored_ids).count()
            duplicates_saved = max(0, total_uploads - total_stored)
            total_bytes = StoredFile.objects.filter(id__in=user_stored_ids).aggregate(Sum("size_bytes"))["size_bytes__sum"] or 0
            duplicate_files = StoredFile.objects.filter(id__in=user_stored_ids, ref_count__gt=1).count()
            profile, _ = UserProfile.objects.get_or_create(user=request.user)
            return Response({
                "total_uploads": total_uploads,
                "total_stored_files": total_stored,
                "duplicates_saved": duplicates_saved,
                "total_storage_bytes": total_bytes,
                "duplicate_groups": duplicate_files,
                "quota_bytes": profile.quota_bytes,
                "used_bytes": total_bytes,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FolderView(APIView):
    def get(self, request):
        from django.db.models import Count
        folders = Folder.objects.filter(user=request.user).annotate(file_count=Count("files")).order_by("name")
        return Response(FolderSerializer(folders, many=True).data)

    def post(self, request):
        name = request.data.get("name", "").strip()
        if not name:
            return Response({"error": "Folder name is required"}, status=status.HTTP_400_BAD_REQUEST)
        if Folder.objects.filter(user=request.user, name__iexact=name).exists():
            return Response({"error": "Folder already exists"}, status=status.HTTP_400_BAD_REQUEST)
        folder = Folder.objects.create(user=request.user, name=name)
        return Response(FolderSerializer(folder).data, status=status.HTTP_201_CREATED)

    def delete(self, request, folder_id):
        try:
            folder = Folder.objects.get(id=folder_id, user=request.user)
            folder.delete()
            return Response({"message": "Folder deleted"}, status=status.HTTP_200_OK)
        except Folder.DoesNotExist:
            return Response({"error": "Folder not found"}, status=status.HTTP_404_NOT_FOUND)


class MoveFileView(APIView):
    def patch(self, request, upload_id):
        try:
            upload = FileUpload.objects.get(id=upload_id, user=request.user)
            folder_id = request.data.get("folder_id")
            if folder_id is None:
                upload.folder = None
            else:
                upload.folder = Folder.objects.get(id=folder_id, user=request.user)
            upload.save()
            return Response(FileUploadSerializer(upload).data)
        except FileUpload.DoesNotExist:
            return Response({"error": "Upload not found"}, status=status.HTTP_404_NOT_FOUND)
        except Folder.DoesNotExist:
            return Response({"error": "Folder not found"}, status=status.HTTP_404_NOT_FOUND)


class DeleteFileUploadView(APIView):
    def delete(self, request, upload_id):
        try:
            upload = FileUpload.objects.select_related("stored_file").get(id=upload_id, user=request.user)
            stored_file = upload.stored_file
            
            # Delete the upload record
            upload.delete()
            
            # Decrement reference count
            stored_file.ref_count -= 1
            stored_file.save()
            
            # If no more references, delete the stored file and physical file
            if stored_file.ref_count <= 0:
                storage_path = stored_file.storage_path
                if os.path.exists(storage_path):
                    os.remove(storage_path)
                stored_file.delete()
            
            return Response({"message": "File deleted successfully"}, status=status.HTTP_200_OK)
        except FileUpload.DoesNotExist:
            return Response({"error": "Upload not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
