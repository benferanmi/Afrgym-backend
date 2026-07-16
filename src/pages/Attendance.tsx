import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Download, Search, Users } from "lucide-react";
import { useAttendanceStore } from "@/stores/attendanceStore";
import { useAuthStore } from "@/stores/authStore";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Attendance() {
  const { records, pagination, loading, fetchAttendance, exportAttendance } = useAttendanceStore();
  const user = useAuthStore((state) => state.user);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user?.role !== "super_admin") return;
    
    fetchAttendance({
      page,
      per_page: 20,
      date_from: dateFrom,
      date_to: dateTo,
    });
  }, [page, dateFrom, dateTo, fetchAttendance, user]);

  const handleExport = () => {
    exportAttendance({
      date_from: dateFrom,
      date_to: dateTo,
    });
  };

  if (user?.role !== "super_admin") {
    return (
      <MainLayout>
        <div className="p-8 text-center text-muted-foreground">
          You do not have permission to view this page.
        </div>
      </MainLayout>
    );
  }

  const filteredRecords = records.filter(r => 
    r.user_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
            <p className="text-muted-foreground">
              Monitor daily check-ins and member visits.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Daily Logs
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search member..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Input 
                    type="date" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[140px]"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input 
                    type="date" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Gym</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Visit Count</TableHead>
                    <TableHead>First Check-in</TableHead>
                    <TableHead>Last Check-in</TableHead>
                    <TableHead>Source(s)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No attendance records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record, index) => (
                      <TableRow key={`${record.user_id}-${record.visit_date}-${index}`}>
                        <TableCell>
                          <div className="font-medium">{record.user_name}</div>
                          <div className="text-sm text-muted-foreground">{record.user_email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {record.gym_identifier === "afrgym_one" ? "Gym One" : "Gym Two"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.visit_date ? format(new Date(record.visit_date), "MMM d, yyyy") : ""}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{record.visit_count}</Badge>
                        </TableCell>
                        <TableCell>
                          {record.first_checkin ? format(new Date(record.first_checkin), "h:mm a") : ""}
                        </TableCell>
                        <TableCell>
                          {record.last_checkin ? format(new Date(record.last_checkin), "h:mm a") : ""}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {record.sources?.split(', ').map((source) => (
                              <Badge key={source} className="capitalize" variant="outline">
                                {source}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(pagination.current_page - 1) * pagination.per_page + 1} to{" "}
                  {Math.min(pagination.current_page * pagination.per_page, pagination.total_items)} of{" "}
                  {pagination.total_items} entries
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= pagination.total_pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
