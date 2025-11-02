import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ImportError {
  row: number;
  reason: string;
}

interface ImportResponse {
  summary: {
    total_rows: number;
    imported: number;
    skipped: number;
  };
  errors: ImportError[];
}

export const BulkImportCard = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No active session');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await supabase.functions.invoke('import-feedbacks-csv', {
        body: formData,
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Import failed');
      }

      const importResult = response.data as ImportResponse;
      setResult(importResult);

      if (importResult.summary.imported > 0) {
        toast.success(
          `Imported ${importResult.summary.imported} feedbacks. ${importResult.summary.skipped} rows skipped.`
        );
      } else {
        toast.error('No rows imported. Check errors below.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `user_username,author_username,author_role,work_date,job_rule,grade,review_subject,notes
john_doe,leader_anna,leader,2025-02-12,Sales pitch,85,Confidence,Great call
jane_smith,,user,2025-02-13,Client meeting,90,Communication,Excellent presentation
bob_jones,leader_anna,leader,2025-02-14,,78,Technical skills,Good work`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Import Feedbacks</CardTitle>
        <CardDescription>Upload a CSV file to import multiple feedback entries at once</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>CSV Format:</strong> user_username, author_username, author_role (user/leader), work_date
            (YYYY-MM-DD), job_rule, grade (1-100), review_subject, notes
            <br />
            <strong>Note:</strong> job_rule defaults to "other" if blank. For author_role="user",
            author_username can be blank (defaults to user_username).
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isUploading}
            className="flex-1"
          />
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload & Import'}
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{result.summary.total_rows}</div>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div className="text-2xl font-bold">{result.summary.imported}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <div className="text-2xl font-bold">{result.summary.skipped}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </CardContent>
              </Card>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Import Errors</h3>
                <div className="max-h-64 overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Row</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((error, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{error.row}</TableCell>
                          <TableCell className="text-sm">{error.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
