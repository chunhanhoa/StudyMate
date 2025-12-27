using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Check.Models;

[BsonIgnoreExtraElements]
public class Post
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; }

    public string UserName { get; set; } // Store name to avoid extra lookups for MVP
    
    public string? UserAvatarUrl { get; set; } // Cache user avatar for display
    
    public string Content { get; set; }
    
    public string? ImageUrl { get; set; } // URL to uploaded image
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Comment> Comments { get; set; } = new List<Comment>();
    
    public int Likes { get; set; } = 0;
    
    public List<string> LikedByUserIds { get; set; } = new List<string>(); // Track who liked
}
