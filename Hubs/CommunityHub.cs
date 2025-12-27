using Microsoft.AspNetCore.SignalR;
using Check.Models;

namespace Check.Hubs;

public class CommunityHub : Hub
{
    // Clients can call these methods, or server can broadcast to all clients
    
    public async Task SendNewPost(Post post)
    {
        // Broadcast to all connected clients
        await Clients.All.SendAsync("ReceivePost", post);
    }

    public async Task SendNewComment(string postId, Comment comment)
    {
        // Broadcast to all connected clients
        await Clients.All.SendAsync("ReceiveComment", postId, comment);
    }

    public async Task SendLikeUpdate(string postId, int newLikeCount, string userId)
    {
        // Broadcast to all connected clients
        await Clients.All.SendAsync("ReceiveLike", postId, newLikeCount, userId);
    }

    public async Task SendUserProfileUpdate(string userId, string newName, string newAvatarUrl)
    {
        // Broadcast to all connected clients when user updates profile
        await Clients.All.SendAsync("UserProfileUpdated", userId, newName, newAvatarUrl);
    }

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
        Console.WriteLine($"Client connected: {Context.ConnectionId}");
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
        Console.WriteLine($"Client disconnected: {Context.ConnectionId}");
    }
}
