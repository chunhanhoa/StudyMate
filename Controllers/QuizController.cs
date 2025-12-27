using Microsoft.AspNetCore.Mvc;
using Check.Models;
using Check.Services;
using System.Text.Json;

namespace Check.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuizController : ControllerBase
{
    private readonly IAIService _aiService;
    private readonly ILogger<QuizController> _logger;

    public QuizController(IAIService aiService, ILogger<QuizController> logger)
    {
        _aiService = aiService;
        _logger = logger;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateQuiz([FromBody] QuizRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Topic))
        {
            return BadRequest("Vui lòng nhập chủ đề.");
        }

        try
        {
            // Limit questions to reasonable range
            int n = Math.Clamp(request.NumberOfQuestions, 1, 10);
            
            var jsonResult = await _aiService.GenerateQuizAsync(request.Topic, n, request.Difficulty);
            
            // Validate JSON by attempting to deserialize
            try 
            {
                var questions = JsonSerializer.Deserialize<List<QuizQuestion>>(jsonResult);
                if (questions == null || questions.Count == 0)
                {
                    return StatusCode(500, "AI không trả về câu hỏi nào hợp lệ.");
                }
                
                // Return structured data
                return Ok(questions);
            }
            catch (JsonException)
            {
                _logger.LogError("AI returned invalid JSON: {Json}", jsonResult);
                return StatusCode(500, "Lỗi định dạng dữ liệu từ AI. Vui lòng thử lại.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GenerateQuiz endpoint");
            return StatusCode(500, "Lỗi server.");
        }
    }
}
