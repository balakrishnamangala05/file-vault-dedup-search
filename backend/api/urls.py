from django.urls import path
from .views import UploadFileView, ListFilesView, ListStoredFilesView, DownloadByUploadIdView

urlpatterns = [
    path("files/upload/", UploadFileView.as_view(), name="upload-file"),
    path("files/", ListFilesView.as_view(), name="list-files"),
    path("stored-files/", ListStoredFilesView.as_view(), name="list-stored-files"),
    path("files/<int:upload_id>/download/", DownloadByUploadIdView.as_view(), name="download-file"),
]
