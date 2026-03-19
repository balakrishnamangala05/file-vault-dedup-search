from django.db import models


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default="#3b82f6")

    class Meta:
        db_table = "api_tag"
        ordering = ["name"]

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


class FileUpload(models.Model):
    original_name = models.CharField(max_length=255)
    stored_file = models.ForeignKey(StoredFile, on_delete=models.CASCADE, related_name="uploads")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "api_fileupload"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"FileUpload({self.original_name})"
