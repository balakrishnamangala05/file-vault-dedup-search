import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_userprofile"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ShareLink",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token", models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("upload", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="share_links",
                    to="api.fileupload",
                )),
                ("created_by", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="share_links",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "api_sharelink", "ordering": ["-created_at"]},
        ),
    ]
