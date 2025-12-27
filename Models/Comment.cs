using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Check.Models;

[BsonIgnoreExtraElements]
public class Comment
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; }
    
    public string UserName { get; set; }

    public string? UserAvatarUrl { get; set; } // Cache user avatar for display

    public string Content { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // For nested comments (replies)
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ParentCommentId { get; set; } // null = top-level comment
    
    public List<Comment> Replies { get; set; } = new List<Comment>();
}
