from rest_framework import serializers
from .models import StoredFile, FileUpload, Tag


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name", "color"]


class FileUploadSerializer(serializers.ModelSerializer):
    stored_file = serializers.SerializerMethodField()
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = FileUpload
        fields = ["id", "original_name", "uploaded_at", "stored_file", "tags"]

    def get_stored_file(self, obj):
        return StoredFileFlatSerializer(obj.stored_file).data


class StoredFileFlatSerializer(serializers.ModelSerializer):
    file_category = serializers.SerializerMethodField()

    class Meta:
        model = StoredFile
        fields = ["id", "sha256", "size_bytes", "storage_path", "mime_type", "file_category", "ref_count", "created_at"]

    def get_file_category(self, obj):
        from .views import get_file_category
        return get_file_category(obj.mime_type)


class StoredFileWithUploadsSerializer(serializers.ModelSerializer):
    uploads = serializers.SerializerMethodField()

    class Meta:
        model = StoredFile
        fields = ["id", "sha256", "size_bytes", "ref_count", "created_at", "uploads"]

    def get_uploads(self, obj):
        return [{"id": u.id, "original_name": u.original_name, "uploaded_at": str(u.uploaded_at)} for u in obj.uploads.all()]
