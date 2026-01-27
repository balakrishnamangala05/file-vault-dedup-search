from rest_framework import serializers
from .models import StoredFile, FileUpload

class StoredFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoredFile
        fields = ["id", "sha256", "size_bytes", "storage_path", "ref_count", "created_at"]

class FileUploadSerializer(serializers.ModelSerializer):
    stored_file = StoredFileSerializer(read_only=True)

    class Meta:
        model = FileUpload
        fields = ["id", "original_name", "uploaded_at", "stored_file"]
