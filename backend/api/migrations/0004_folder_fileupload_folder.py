from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0003_tag_fileupload_tags"),
    ]

    operations = [
        migrations.CreateModel(
            name="Folder",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "api_folder",
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="fileupload",
            name="folder",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="files",
                to="api.folder",
            ),
        ),
    ]
