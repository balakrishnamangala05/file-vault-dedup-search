from django.urls import path
from .views import UploadFileView, ListFilesView, ListStoredFilesView, DownloadByUploadIdView, DeleteFileUploadView, StatsView

urlpatterns = [
    path("stats/", StatsView.as_view(), name="stats"),
    path("files/upload/", UploadFileView.as_view(), name="upload-file"),
    path("files/", ListFilesView.as_view(), name="list-files"),
    path("stored-files/", ListStoredFilesView.as_view(), name="list-stored-files"),
    path("files/<int:upload_id>/download/", DownloadByUploadIdView.as_view(), name="download-file"),
    path("files/<int:upload_id>/", DeleteFileUploadView.as_view(), name="delete-file"),
]
