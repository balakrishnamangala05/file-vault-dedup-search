from django.conf import settings
from django.db import models


class Tag(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tags", null=True)
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default="#3b82f6")

    class Meta:
        db_table = "api_tag"
        ordering = ["name"]
        unique_together = [("user", "name")]

    def __str__(self):
        return self.name


class StoredFile(models.Model):
    sha256 = models.CharField(max_length=64, unique=True, db_index=True)
    size_bytes = models.BigIntegerField()
    storage_path = models.TextField()
    mime_type = models.CharField(max_length=120, default="application/octet-stream")
    ref_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "api_storedfile"
        ordering = ["-created_at"]

    def __str__(self):
        return f"StoredFile({self.sha256[:16]}...)"


class Folder(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="folders", null=True)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "api_folder"
        ordering = ["name"]

    def __str__(self):
        return self.name


class FileUpload(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="uploads", null=True)
    original_name = models.CharField(max_length=255)
    stored_file = models.ForeignKey(StoredFile, on_delete=models.CASCADE, related_name="uploads")
    tags = models.ManyToManyField(Tag, blank=True, related_name="uploads")
    folder = models.ForeignKey(Folder, null=True, blank=True, on_delete=models.SET_NULL, related_name="files")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "api_fileupload"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"FileUpload({self.original_name})"


class FileIndex(models.Model):
    upload = models.OneToOneField(FileUpload, on_delete=models.CASCADE, related_name="index")
    content_text = models.TextField(blank=True)
    indexed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "api_fileindex"

    def __str__(self):
        return f"FileIndex({self.upload.original_name})"
