import hashlib
import os
from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import StoredFile, FileUpload
from .serializers import FileUploadSerializer, StoredFileSerializer


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


class UploadFileView(APIView):
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        sha256, size_bytes, storage_path = compute_sha256_and_save(uploaded_file)

        stored, created = StoredFile.objects.get_or_create(
            sha256=sha256,
            defaults={
                "size_bytes": size_bytes,
                "storage_path": storage_path,
                "ref_count": 1,  # Start at 1 for new files
            }
        )

        if not created:
            # File already exists, increment reference count
            stored.ref_count += 1
            stored.save()

        upload = FileUpload.objects.create(
            original_name=uploaded_file.name,
            stored_file=stored
        )

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

            uploads = FileUpload.objects.select_related("stored_file").all().order_by(order_by)

            if q:
                uploads = uploads.filter(original_name__icontains=q)

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
        return Response(StoredFileSerializer(stored, many=True).data)


class DownloadByUploadIdView(APIView):
    def get(self, request, upload_id):
        try:
            upload = FileUpload.objects.select_related("stored_file").get(id=upload_id)
        except FileUpload.DoesNotExist:
            raise Http404("Upload not found")

        path = upload.stored_file.storage_path
        if not os.path.exists(path):
            raise Http404("Stored file missing")

        file_handle = open(path, "rb")
        response = FileResponse(file_handle, as_attachment=True, filename=upload.original_name)
        return response


class StatsView(APIView):
    def get(self, request):
        try:
            from django.db.models import Sum, Count
            total_uploads = FileUpload.objects.count()
            total_stored = StoredFile.objects.count()
            duplicates_saved = max(0, total_uploads - total_stored)
            total_bytes = StoredFile.objects.aggregate(Sum("size_bytes"))["size_bytes__sum"] or 0
            duplicate_files = StoredFile.objects.filter(ref_count__gt=1).count()
            return Response({
                "total_uploads": total_uploads,
                "total_stored_files": total_stored,
                "duplicates_saved": duplicates_saved,
                "total_storage_bytes": total_bytes,
                "duplicate_groups": duplicate_files,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DeleteFileUploadView(APIView):
    def delete(self, request, upload_id):
        try:
            upload = FileUpload.objects.select_related("stored_file").get(id=upload_id)
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
