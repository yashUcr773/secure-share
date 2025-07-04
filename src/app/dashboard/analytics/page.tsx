"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Eye, Download, Share2, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  totalViews: number;
  totalDownloads: number;
  totalShares: number;
  activeLinks: number;
  recentActivity: ActivityItem[];
  popularFiles: PopularFile[];
  viewsOverTime: ViewsData[];
}

interface ActivityItem {
  id: string;
  type: "view" | "download" | "share";
  fileName: string;
  timestamp: string;
  userAgent?: string;
}

interface PopularFile {
  id: string;
  fileName: string;
  views: number;
  downloads: number;
  shares: number;
}

interface ViewsData {
  date: string;
  views: number;
  downloads: number;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/analytics?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      console.log("🚀 ~ fetchAnalytics ~ data:", data)
      
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        throw new Error(data.error || 'Failed to fetch analytics');
      }
      
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityIcon = (type: "view" | "download" | "share") => {
    switch (type) {
      case "view":
        return <Eye className="h-4 w-4 text-blue-500" />;
      case "download":
        return <Download className="h-4 w-4 text-green-500" />;
      case "share":
        return <Share2 className="h-4 w-4 text-purple-500" />;
    }
  };

  const getActivityLabel = (type: "view" | "download" | "share") => {
    switch (type) {
      case "view":
        return "viewed";
      case "download":
        return "downloaded";
      case "share":
        return "shared";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Failed to load analytics data</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">
              Track the performance of your shared files
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeRange === "7d" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange("7d")}
            >
              7 days
            </Button>
            <Button
              variant={timeRange === "30d" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange("30d")}
            >
              30 days
            </Button>
            <Button
              variant={timeRange === "90d" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange("90d")}
            >
              90 days
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />                
                <div>
                  <div className="text-2xl font-bold">{(analytics.totalViews || 0)}</div>
                  <div className="text-sm text-muted-foreground">Total Views</div>
                </div>
              </div>
            </CardContent>
          </Card>          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{(analytics.totalDownloads || 0)}</div>
                  <div className="text-sm text-muted-foreground">Total Downloads</div>
                </div>
              </div>
            </CardContent>
          </Card>          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{(analytics.totalShares || 0)}</div>
                  <div className="text-sm text-muted-foreground">Total Shares</div>
                </div>
              </div>
            </CardContent>
          </Card>          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{analytics.activeLinks || 0}</div>
                  <div className="text-sm text-muted-foreground">Active Links</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Popular Files */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Files</CardTitle>
              <CardDescription>
                Your most viewed and downloaded files
              </CardDescription>
            </CardHeader>            <CardContent>
              <div className="space-y-4">
                {(analytics.popularFiles || []).map((file, index) => (
                  <div key={file.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.fileName}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {file.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {file.downloads}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="h-3 w-3" />
                          {file.shares}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest interactions with your files
              </CardDescription>
            </CardHeader>            <CardContent>
              <div className="space-y-4">
                {(analytics.recentActivity || []).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4">
                    <div className="p-2 bg-secondary rounded-full">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.fileName}</span> was{" "}
                        <span className="text-muted-foreground">{getActivityLabel(activity.type)}</span>
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(activity.timestamp)}
                        {activity.userAgent && (
                          <>
                            <span>•</span>
                            <span>{activity.userAgent}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>        {/* Views Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Views & Downloads Over Time</CardTitle>
            <CardDescription>
              Track engagement trends for the last {timeRange}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analytics.viewsOverTime || []}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    }}
                  />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", { 
                        weekday: "short",
                        month: "short", 
                        day: "numeric" 
                      });
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    name="Views"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="downloads" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                    name="Downloads"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
