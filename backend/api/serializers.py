from rest_framework import serializers
from .models import StoredFile, FileUpload


class FileUploadSerializer(serializers.ModelSerializer):
    stored_file = serializers.SerializerMethodField()

    class Meta:
        model = FileUpload
        fields = ["id", "original_name", "uploaded_at", "stored_file"]

    def get_stored_file(self, obj):
        return StoredFileFlatSerializer(obj.stored_file).data


class StoredFileFlatSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoredFile
        fields = ["id", "sha256", "size_bytes", "storage_path", "ref_count", "created_at"]


class StoredFileWithUploadsSerializer(serializers.ModelSerializer):
    uploads = serializers.SerializerMethodField()

    class Meta:
        model = StoredFile
        fields = ["id", "sha256", "size_bytes", "ref_count", "created_at", "uploads"]

    def get_uploads(self, obj):
        return [{"id": u.id, "original_name": u.original_name, "uploaded_at": str(u.uploaded_at)} for u in obj.uploads.all()]
