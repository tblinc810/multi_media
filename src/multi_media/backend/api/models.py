from django.db import models

class Server(models.Model):
    server_id = models.IntegerField(unique=True, help_text="e.g. 7, 8, 9")
    url = models.URLField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Server {self.server_id} ({self.url})"
