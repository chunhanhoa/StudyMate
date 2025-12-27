namespace Check.Services;

public interface IAIService
{
    Task<string> GetStudyAdviceAsync(string studentMessage, object studyData, CancellationToken ct = default);
    Task<string> GenerateQuizAsync(string topic, int numberOfQuestions, string difficulty, CancellationToken ct = default);
}
