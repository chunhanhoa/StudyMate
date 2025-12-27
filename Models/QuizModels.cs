using System.Text.Json.Serialization;

namespace Check.Models;

public class QuizRequest
{
    public string Topic { get; set; } = string.Empty;
    public int NumberOfQuestions { get; set; } = 5;
    public string Difficulty { get; set; } = "Medium"; // Easy, Medium, Hard
}

public class QuizQuestion
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("question")]
    public string QuestionText { get; set; } = string.Empty;

    [JsonPropertyName("options")]
    public List<string> Options { get; set; } = new();

    [JsonPropertyName("correctAnswer")]
    public int CorrectAnswer { get; set; } // Index 0-3

    [JsonPropertyName("explanation")]
    public string Explanation { get; set; } = string.Empty;
}
