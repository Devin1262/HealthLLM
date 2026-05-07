using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FhirToBedrockJsonConverter;

class Program
{
    static void Main(string[] args)
    {
        // Validate Arguments
        if (args.Length < 2)
        {
            Console.WriteLine("Usage: FhirToBedrockJsonConverter.exe <input_directory> <output_file_path>");
            Console.WriteLine("Example: ./FhirToBedrockJsonConverter.exe ./fhir_samples ./training_data.jsonl");
            return;
        }

        string inputDirectory = args[0];
        string outputPath = args[1];

        // Setup Output File
        try
        {
            // Get the directory containing the output file
            string? outputDirectory = Path.GetDirectoryName(outputPath);

            // If the path contains a directory and it doesn't exist, create it
            if (!string.IsNullOrEmpty(outputDirectory) && !Directory.Exists(outputDirectory))
            {
                Directory.CreateDirectory(outputDirectory);
                Console.WriteLine($"Created output directory: {outputDirectory}");
            }

            // Clear the existing file if it exists so we start fresh
            if (File.Exists(outputPath))
            {
                File.Delete(outputPath);
            }
        }
        catch (IOException ex)
        {
            Console.WriteLine($"Error: Could not prepare output path. {ex.Message}");
            return;
        }
        catch (UnauthorizedAccessException ex)
        {
            Console.WriteLine($"Error: Permission denied when accessing output path. {ex.Message}");
            return;
        }

        // Ensure input directory exists
        if (!Directory.Exists(inputDirectory))
        {
            Console.WriteLine($"Error: Input directory '{inputDirectory}' does not exist.");
            return;
        }

        // Process Files
        string[] fhirFiles = Directory.GetFiles(inputDirectory, "*.json");
        Console.WriteLine($"Found {fhirFiles.Length} files in {inputDirectory}. Starting conversion...");

        int successCount = 0;
        int errorCount = 0;

        foreach (string file in fhirFiles)
        {
            if (ConvertFhirToBedrock(file, outputPath))
            {
                successCount++;
                Console.WriteLine($"[OK] {Path.GetFileName(file)}");
            }
            else
            {
                errorCount++;
                Console.WriteLine($"[SKIP/ERROR] {Path.GetFileName(file)}");
            }
        }

        Console.WriteLine("\n--- Conversion Summary ---");
        Console.WriteLine($"Successfully converted: {successCount}");
        Console.WriteLine($"Failed or skipped:     {errorCount}");
        Console.WriteLine($"Final Dataset:         {Path.GetFullPath(outputPath)}");
    }

    public static bool ConvertFhirToBedrock(string inputPath, string outputPath)
    {
        try
        {
            // Load the Synthea FHIR Bundle
            string jsonContent = File.ReadAllText(inputPath);
            JObject bundle = JObject.Parse(jsonContent);

            if (bundle["resourceType"]?.ToString() != "Bundle")
            {
                Console.WriteLine($"Error: {Path.GetFileName(inputPath)} is not a FHIR Bundle.");
                return false;
            }

            var entries = bundle["entry"] as JArray;

            if (entries == null)
                return false;

            // Extract the Diagnosis (The target answer)
            string diagnosis = ExtractDiagnosisFromBundle(bundle);

            // Extract Clinical Context (Lab results/Observations) to help the LLM "Guess"
            var observations = entries
                .Select(e => e["resource"])
                .Where(r => r?["resourceType"]?.ToString() == "Observation")
                .Select(obs =>
                {
                    string code = obs?["code"]?["text"]?.ToString()
                                  ?? obs?["code"]?["coding"]?[0]?["display"]?.ToString()
                                  ?? "Unknown Test";
                    string val = obs?["valueQuantity"]?["value"]?.ToString() ?? "N/A";
                    string unit = obs?["valueQuantity"]?["unit"]?.ToString() ?? "";
                    return $"{code}: {val} {unit}";
                });

            string clinicalContext = string.Join(", ", observations.Take(15)); // Take top 15 for token efficiency

            string promptContent = $"Patient Lab Results: {clinicalContext}. Based on these FHIR observations, what is the most likely diagnosis?";
            string promptLikelyDiagnosis = $"Based on the clinical data provided, the likely diagnosis is {diagnosis}.";

            // Structure for Bedrock Conversational (.jsonl) Format
            var bedrockEntry = new
            {
                messages = new[]
                {
                    new
                    {
                        role = "user",
                        content = new[] { new { text = promptContent } }
                    },
                    new
                    {
                        role = "assistant",
                        content = new[] { new { text = promptLikelyDiagnosis } }
                    }
                }
            };

            // Append to the .jsonl file (One line per patient bundle)
            string jsonLine = JsonConvert.SerializeObject(bedrockEntry, Formatting.None);

            lock (outputPath)
            {
                File.AppendAllLines(outputPath, [jsonLine]);
            }

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Critical Error processing {Path.GetFileName(inputPath)}: {ex.Message}");
            return false;
        }
    }

    public static string ExtractDiagnosisFromBundle(JObject bundle)
    {
        // Navigate to the entries in the FHIR Bundle
        var entries = bundle["entry"] as JArray;

        // Find the first 'active' Condition resource
        var condition = entries?
            .Select(e => e["resource"])
            .FirstOrDefault(r =>
                r?["resourceType"]?.ToString() == "Condition" &&
                (r["clinicalStatus"]?["coding"]?[0]?["code"]?.ToString() == "active" ||
                    r["clinicalStatus"]?["text"]?.ToString() == "active")
            );

        if (condition != null)
        {
            // Try 'text' first, then fallback to 'display' name
            return condition["code"]?["text"]?.ToString()
                   ?? condition["code"]?["coding"]?[0]?["display"]?.ToString()
                   ?? "General Malaise";
        }

        return "No active condition found";
    }
}
