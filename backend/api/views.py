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
            uploads = FileUpload.objects.select_related("stored_file").all().order_by("-uploaded_at")

            if q:
                uploads = uploads.filter(original_name__icontains=q)

            serializer = FileUploadSerializer(uploads, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
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
