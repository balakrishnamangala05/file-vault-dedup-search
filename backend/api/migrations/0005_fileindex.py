from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0004_folder_fileupload_folder"),
    ]

    operations = [
        migrations.CreateModel(
            name="FileIndex",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("content_text", models.TextField(blank=True)),
                ("indexed_at", models.DateTimeField(auto_now=True)),
                (
                    "upload",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="index",
                        to="api.fileupload",
                    ),
                ),
            ],
            options={
                "db_table": "api_fileindex",
            },
        ),
    ]
