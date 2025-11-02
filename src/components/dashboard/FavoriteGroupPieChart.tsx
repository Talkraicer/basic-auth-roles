import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface GradeBucket {
  label: string;
  count: number;
}

interface FavoriteGroup {
  groupname: string;
}

export function FavoriteGroupPieChart() {
  const [favoriteGroups, setFavoriteGroups] = useState<FavoriteGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [buckets, setBuckets] = useState<GradeBucket[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFavoriteGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadGradeBuckets();
    }
  }, [selectedGroup]);

  const loadFavoriteGroups = async () => {
    try {
      setLoadingGroups(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke("group-favorites", {
        method: "GET",
      });

      if (fetchError) {
        throw fetchError;
      }

      setFavoriteGroups(data.groups || []);
      
      // Auto-select first group if available
      if (data.groups && data.groups.length > 0) {
        setSelectedGroup(data.groups[0].groupname);
      }
    } catch (err) {
      console.error("Error loading favorite groups:", err);
      setError("Failed to load favorite groups");
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadGradeBuckets = async () => {
    if (!selectedGroup) return;

    try {
      setLoadingBuckets(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke(
        `group-grade-buckets?groupname=${encodeURIComponent(selectedGroup)}`,
        {
          method: "GET",
        }
      );

      if (fetchError) {
        throw fetchError;
      }

      setBuckets(data.buckets || []);
    } catch (err) {
      console.error("Error loading grade buckets:", err);
      setError("Failed to load grade buckets");
    } finally {
      setLoadingBuckets(false);
    }
  };

  const getColor = (label: string) => {
    return label === "Below 70" ? "#ef4444" : "#22c55e";
  };

  const totalMembers = buckets.reduce((sum, b) => sum + b.count, 0);

  if (loadingGroups) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Favorite Group Performance</CardTitle>
          <CardDescription>Review quality distribution for your favorite groups</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (favoriteGroups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Favorite Group Performance</CardTitle>
          <CardDescription>Review quality distribution for your favorite groups</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">You have no favorite groups yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Favorite Group Performance</CardTitle>
        <CardDescription>Review quality distribution for your favorite groups</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="favorite-group-select">Select Favorite Group</Label>
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger id="favorite-group-select">
              <SelectValue placeholder="Select a favorite group" />
            </SelectTrigger>
            <SelectContent>
              {favoriteGroups.map((group) => (
                <SelectItem key={group.groupname} value={group.groupname}>
                  {group.groupname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-destructive">{error}</p>}

        {loadingBuckets && (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loadingBuckets && selectedGroup && totalMembers === 0 && (
          <p className="text-muted-foreground">No feedback data available for this group.</p>
        )}

        {!loadingBuckets && selectedGroup && totalMembers > 0 && (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={buckets}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ label, count }) => `${label}: ${count}`}
                >
                  {buckets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry.label)} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-center text-sm text-muted-foreground">
              Total members counted: {totalMembers}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
