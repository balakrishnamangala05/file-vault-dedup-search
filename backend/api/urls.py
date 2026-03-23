from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .auth_views import RegisterView
from .views import (
    UploadFileView, ListFilesView, ListStoredFilesView,
    DownloadByUploadIdView, DeleteFileUploadView, StatsView,
    DuplicatesView, BulkDeleteView, BulkDownloadZipView,
    TagView, FileTagView, FolderView, MoveFileView,
    ShareLinkView, PublicDownloadView,
    TrashView, RestoreFileView, PermanentDeleteView,
    FileCommentView,
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

    # tags
    path("tags/", TagView.as_view(), name="tags"),
    path("tags/<int:tag_id>/", TagView.as_view(), name="tag-detail"),
    path("files/<int:upload_id>/tags/", FileTagView.as_view(), name="file-tags"),
    path("files/<int:upload_id>/tags/<int:tag_id>/", FileTagView.as_view(), name="file-tag-detail"),

    # folders
    path("folders/", FolderView.as_view(), name="folders"),
    path("folders/<int:folder_id>/", FolderView.as_view(), name="folder-detail"),
    path("files/<int:upload_id>/move/", MoveFileView.as_view(), name="move-file"),

    # share links
    path("files/<int:upload_id>/share/", ShareLinkView.as_view(), name="share-links"),
    path("files/<int:upload_id>/share/<int:link_id>/", ShareLinkView.as_view(), name="share-link-detail"),
    path("public/<uuid:token>/", PublicDownloadView.as_view(), name="public-download"),

    # trash
    path("trash/", TrashView.as_view(), name="trash"),
    path("trash/<int:upload_id>/restore/", RestoreFileView.as_view(), name="restore-file"),
    path("trash/<int:upload_id>/", PermanentDeleteView.as_view(), name="permanent-delete"),

    # comments
    path("files/<int:upload_id>/comments/", FileCommentView.as_view(), name="file-comments"),
    path("files/<int:upload_id>/comments/<int:comment_id>/", FileCommentView.as_view(), name="file-comment-detail"),
]
