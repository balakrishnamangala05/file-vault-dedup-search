from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .auth_views import RegisterView
from .views import (
    UploadFileView, ListFilesView, ListStoredFilesView,
    DownloadByUploadIdView, DeleteFileUploadView, StatsView,
    DuplicatesView, BulkDeleteView, BulkDownloadZipView,
)

urlpatterns = [
    # auth
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # files
    path("stats/", StatsView.as_view(), name="stats"),
    path("files/upload/", UploadFileView.as_view(), name="upload-file"),
    path("files/bulk-delete/", BulkDeleteView.as_view(), name="bulk-delete"),
    path("files/download-zip/", BulkDownloadZipView.as_view(), name="download-zip"),
    path("files/", ListFilesView.as_view(), name="list-files"),
    path("stored-files/", ListStoredFilesView.as_view(), name="list-stored-files"),
    path("duplicates/", DuplicatesView.as_view(), name="duplicates"),
    path("files/<int:upload_id>/download/", DownloadByUploadIdView.as_view(), name="download-file"),
    path("files/<int:upload_id>/", DeleteFileUploadView.as_view(), name="delete-file"),
]
