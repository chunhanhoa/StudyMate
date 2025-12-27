using Check.Models;
using Check.Services;
using Check.Hubs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using System.Security.Claims;

namespace Check.Controllers;

[Route("api/[controller]")]
[ApiController]
public class CommunityController : ControllerBase
{
    private readonly MongoDbContext _context;
    private readonly IHubContext<CommunityHub> _hubContext;

    public CommunityController(MongoDbContext context, IHubContext<CommunityHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet("posts")]
    public async Task<IActionResult> GetPosts([FromQuery] int page = 1, [FromQuery] int pageSize = 5)
    {
        var posts = await _context.Posts.Find(_ => true)
            .SortByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        // For each post, structure comments into trees
        foreach (var post in posts)
        {
            if (post.Comments != null && post.Comments.Any())
            {
                post.Comments = StructureCommentsAsTree(post.Comments);
            }
        }
            
        return Ok(posts);
    }

    private List<Comment> StructureCommentsAsTree(List<Comment> flatComments)
    {
        var commentMap = flatComments.ToDictionary(c => c.Id);
        var rootComments = new List<Comment>();

        foreach (var comment in flatComments)
        {
            if (string.IsNullOrEmpty(comment.ParentCommentId))
            {
                rootComments.Add(comment);
            }
            else if (commentMap.TryGetValue(comment.ParentCommentId, out var parent))
            {
                if (parent.Replies == null) parent.Replies = new List<Comment>();
                parent.Replies.Add(comment);
            }
            else
            {
                // Parent not found in this post's comments (shouldn't happen with current logic, but safe fallback)
                rootComments.Add(comment);
            }
        }

        // Sort root and replies by date (optional, but good for consistency)
        rootComments = rootComments.OrderBy(c => c.CreatedAt).ToList();
        foreach (var root in rootComments)
        {
            SortReplies(root);
        }

        return rootComments;
    }

    private void SortReplies(Comment comment)
    {
        if (comment.Replies != null && comment.Replies.Any())
        {
            comment.Replies = comment.Replies.OrderBy(c => c.CreatedAt).ToList();
            foreach (var reply in comment.Replies)
            {
                SortReplies(reply);
            }
        }
    }

    [HttpPost("posts/with-file")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> CreatePostWithFile([FromForm] CreatePostWithFileRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
             if (!string.IsNullOrEmpty(request.UserId)) userId = request.UserId;
             else return Unauthorized("User not identified");
        }
        
        var user = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null) return NotFound("User not found");

        string? fileUrl = null;
        if (request.File != null && request.File.Length > 0)
        {
            // Simple file upload to wwwroot/uploads/posts
            var uploads = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "posts");
            if (!Directory.Exists(uploads)) Directory.CreateDirectory(uploads);
            
            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(request.File.FileName)}";
            var filePath = Path.Combine(uploads, fileName);
            
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await request.File.CopyToAsync(stream);
            }
            
            fileUrl = $"/uploads/posts/{fileName}";
        }

        var post = new Post
        {
            UserId = userId,
            UserName = user.FullName ?? user.Username,
            UserAvatarUrl = user.AvatarUrl,
            Content = request.Content,
            ImageUrl = fileUrl, // Assuming model supports this or Mongo is flexible
            CreatedAt = DateTime.UtcNow
        };

        await _context.Posts.InsertOneAsync(post);
        await _hubContext.Clients.All.SendAsync("ReceivePost", post);
        
        return Ok(post);
    }

    [HttpPost("posts")]
    public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
             if (!string.IsNullOrEmpty(request.UserId)) userId = request.UserId;
             else return Unauthorized("User not identified");
        }
        
        var user = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null) return NotFound("User not found");

        var post = new Post
        {
            UserId = userId,
            UserName = user.FullName ?? user.Username,
            UserAvatarUrl = user.AvatarUrl,
            Content = request.Content,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Posts.InsertOneAsync(post);
        await _hubContext.Clients.All.SendAsync("ReceivePost", post);
        
        return Ok(post);
    }

    [HttpPost("posts/{id}/comments")]
    public async Task<IActionResult> AddComment(string id, [FromBody] CreateCommentRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
         if (string.IsNullOrEmpty(userId))
        {
             if (!string.IsNullOrEmpty(request.UserId)) userId = request.UserId;
             else return Unauthorized("User not identified");
        }

        var user = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null) return NotFound("User not found");

        var comment = new Comment
        {
            UserId = userId,
            UserName = user.FullName ?? user.Username,
            UserAvatarUrl = user.AvatarUrl,
            Content = request.Content,
            ParentCommentId = request.ParentCommentId 
        };

        var update = Builders<Post>.Update.Push(p => p.Comments, comment);
        var result = await _context.Posts.UpdateOneAsync(p => p.Id == id, update);

        if (result.ModifiedCount == 0) return NotFound("Post not found");
        
        await _hubContext.Clients.All.SendAsync("ReceiveComment", id, comment);

        return Ok(comment);
    }
    
    [HttpPost("posts/{id}/like")]
    public async Task<IActionResult> LikePost(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            userId = Request.Headers["X-User-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User not identified");
        }

        var post = await _context.Posts.Find(p => p.Id == id).FirstOrDefaultAsync();
        if (post == null) return NotFound("Post not found");

        if (post.LikedByUserIds.Contains(userId))
        {
            post.LikedByUserIds.Remove(userId);
            post.Likes = Math.Max(0, post.Likes - 1);
        }
        else
        {
            post.LikedByUserIds.Add(userId);
            post.Likes++;
        }

        var update = Builders<Post>.Update
            .Set(p => p.Likes, post.Likes)
            .Set(p => p.LikedByUserIds, post.LikedByUserIds);
        
        await _context.Posts.UpdateOneAsync(p => p.Id == id, update);
        
        await _hubContext.Clients.All.SendAsync("ReceiveLike", id, post.Likes, userId);

        return Ok(new { likes = post.Likes, isLiked = post.LikedByUserIds.Contains(userId) });
    }
}

public class CreatePostRequest
{
    public string Content { get; set; }
    public string? UserId { get; set; }
}

public class CreatePostWithFileRequest
{
    public string? Content { get; set; }
    public string? UserId { get; set; }
    public IFormFile? File { get; set; }
}

public class CreateCommentRequest
{
    public string Content { get; set; }
    public string? UserId { get; set; } 
    public string? ParentCommentId { get; set; }
}
