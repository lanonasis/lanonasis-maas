import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, BarChart4, Calendar, Clock, Download, LineChart, PieChart } from "lucide-react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from "recharts";

const areaChartData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 500 },
  { name: 'Apr', value: 700 },
  { name: 'May', value: 600 },
  { name: 'Jun', value: 800 },
  { name: 'Jul', value: 1000 },
  { name: 'Aug', value: 900 },
  { name: 'Sep', value: 1200 },
  { name: 'Oct', value: 1100 },
  { name: 'Nov', value: 1300 },
  { name: 'Dec', value: 1400 },
];

const barChartData = [
  { name: 'Payment', value: 2400 },
  { name: 'Wallet', value: 1600 },
  { name: 'Verification', value: 1200 },
  { name: 'Utility', value: 800 },
  { name: 'Bank', value: 1800 },
  { name: 'Fraud', value: 600 },
];

const pieChartData = [
  { name: 'Payment', value: 40 },
  { name: 'Bank Statement', value: 30 },
  { name: 'Verification', value: 20 },
  { name: 'Fraud', value: 10 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const ApiAnalytics = () => {
  const [timeRange, setTimeRange] = useState("last-30-days");

  return (
    <Layout>
      <div className="container mx-auto py-16 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">API Analytics</h1>
            <p className="text-muted-foreground">
              Monitor your API usage, performance metrics, and trends
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select defaultValue={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last-7-days">Last 7 days</SelectItem>
                <SelectItem value="last-30-days">Last 30 days</SelectItem>
                <SelectItem value="this-month">This month</SelectItem>
                <SelectItem value="last-month">Last month</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            
            <Link to="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
            
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total API Calls</CardDescription>
              <CardTitle className="text-3xl">124,892</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground flex items-center">
                <div className="mr-2 text-green-500">+12.5%</div>
                <div>from previous period</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Response Time</CardDescription>
              <CardTitle className="text-3xl">235 ms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground flex items-center">
                <div className="mr-2 text-green-500">-18.3%</div>
                <div>from previous period</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Error Rate</CardDescription>
              <CardTitle className="text-3xl">0.42%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground flex items-center">
                <div className="mr-2 text-green-500">-0.2%</div>
                <div>from previous period</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active API Keys</CardDescription>
              <CardTitle className="text-3xl">18</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground flex items-center">
                <div className="mr-2 text-green-500">+2</div>
                <div>from previous period</div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="usage" className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="usage">Usage Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoint Activity</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="usage">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="h-5 w-5 text-primary" />
                        API Calls Over Time
                      </CardTitle>
                      <CardDescription>Daily API requests trend</CardDescription>
                    </div>
                    <Select defaultValue="daily">
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Interval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={areaChartData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#0088FE" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#0088FE"
                          fillOpacity={1}
                          fill="url(#colorValue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    API Usage by Service
                  </CardTitle>
                  <CardDescription>Distribution of API calls</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="performance">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Response Time Trend
                      </CardTitle>
                      <CardDescription>Average response time (ms)</CardDescription>
                    </div>
                    <Select defaultValue="daily">
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Interval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={areaChartData.map(item => ({ ...item, value: item.value / 4 }))}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#00C49F" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#00C49F"
                          fillOpacity={1}
                          fill="url(#colorPerf)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-primary" />
                    Performance by Service
                  </CardTitle>
                  <CardDescription>Average response time by API service (ms)</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={barChartData.map(item => ({ ...item, value: Math.floor(item.value / 10) }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <XAxis type="number" axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#00C49F" radius={[0, 4, 4, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="endpoints">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart4 className="h-5 w-5 text-primary" />
                      Most Active Endpoints
                    </CardTitle>
                    <CardDescription>API endpoints with the most traffic</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">Endpoint</th>
                        <th className="text-left p-4 font-medium">Service</th>
                        <th className="text-left p-4 font-medium">Calls</th>
                        <th className="text-left p-4 font-medium">Avg. Response Time</th>
                        <th className="text-left p-4 font-medium">Error Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { endpoint: '/v1/payment/process', service: 'Payment', calls: '32,451', response: '187ms', error: '0.3%' },
                        { endpoint: '/v1/bank-statements/retrieve', service: 'Bank Statement', calls: '28,912', response: '312ms', error: '0.5%' },
                        { endpoint: '/v1/verification/id', service: 'Verification', calls: '18,723', response: '245ms', error: '0.7%' },
                        { endpoint: '/v1/wallet/balance', service: 'Wallet', calls: '15,482', response: '146ms', error: '0.2%' },
                        { endpoint: '/v1/utility/pay', service: 'Utility', calls: '10,289', response: '203ms', error: '0.4%' },
                        { endpoint: '/v1/fraud/analyze', service: 'Fraud', calls: '9,872', response: '421ms', error: '0.6%' },
                        { endpoint: '/v1/trade/finance', service: 'Trade Finance', calls: '4,217', response: '267ms', error: '0.5%' },
                      ].map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-4 align-middle">{item.endpoint}</td>
                          <td className="p-4 align-middle">{item.service}</td>
                          <td className="p-4 align-middle">{item.calls}</td>
                          <td className="p-4 align-middle">{item.response}</td>
                          <td className="p-4 align-middle">{item.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="errors">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="h-5 w-5 text-primary" />
                        Error Rate Trend
                      </CardTitle>
                      <CardDescription>Percentage of failed API calls</CardDescription>
                    </div>
                    <Select defaultValue="daily">
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Interval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={areaChartData.map(item => ({ ...item, value: (item.value / 20000) * Math.random() }))}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF8042" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#FF8042" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <Tooltip formatter={(value) => [`${(Number(value) * 100).toFixed(2)}%`, 'Error Rate']} />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#FF8042"
                          fillOpacity={1}
                          fill="url(#colorError)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>API Key Usage</CardTitle>
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select API key" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All API Keys</SelectItem>
                  <SelectItem value="key-1">Primary API Key</SelectItem>
                  <SelectItem value="key-2">Secondary API Key</SelectItem>
                  <SelectItem value="key-3">Dev API Key</SelectItem>
                  <SelectItem value="key-4">Test API Key</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">API Key Name</th>
                    <th className="text-left p-4 font-medium">Created</th>
                    <th className="text-left p-4 font-medium">Last Used</th>
                    <th className="text-left p-4 font-medium">Total Calls</th>
                    <th className="text-left p-4 font-medium">Services</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Primary API Key', created: '2023-01-15', lastUsed: '2023-09-18 12:45 GMT', calls: '78,421', services: 'All' },
                    { name: 'Frontend API Key', created: '2023-02-22', lastUsed: '2023-09-18 11:23 GMT', calls: '25,782', services: 'Payments, Wallet' },
                    { name: 'Mobile App Key', created: '2023-03-10', lastUsed: '2023-09-18 09:57 GMT', calls: '16,945', services: 'All' },
                    { name: 'Test Environment', created: '2023-05-05', lastUsed: '2023-09-15 14:32 GMT', calls: '3,872', services: 'All' },
                    { name: 'Development Key', created: '2023-06-18', lastUsed: '2023-09-16 08:15 GMT', calls: '894', services: 'Bank Statements, Verification' },
                  ].map((key, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-4 align-middle font-medium">{key.name}</td>
                      <td className="p-4 align-middle">{key.created}</td>
                      <td className="p-4 align-middle">{key.lastUsed}</td>
                      <td className="p-4 align-middle">{key.calls}</td>
                      <td className="p-4 align-middle">{key.services}</td>
                      <td className="p-4 align-middle text-right">
                        <Button variant="ghost" size="sm">View Details</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ApiAnalytics;
