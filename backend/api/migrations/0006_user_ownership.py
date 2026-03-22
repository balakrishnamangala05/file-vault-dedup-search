from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_fileindex"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add user to Tag
        migrations.AddField(
            model_name="tag",
            name="user",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="tags",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # Remove old global unique constraint on tag name
        migrations.AlterField(
            model_name="tag",
            name="name",
            field=models.CharField(max_length=50),
        ),
        # Add per-user unique constraint on tag name
        migrations.AlterUniqueTogether(
            name="tag",
            unique_together={("user", "name")},
        ),
        # Add user to Folder
        migrations.AddField(
            model_name="folder",
            name="user",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="folders",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # Add user to FileUpload
        migrations.AddField(
            model_name="fileupload",
            name="user",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="uploads",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
