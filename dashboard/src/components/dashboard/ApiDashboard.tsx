
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentGateways } from "./api-services/PaymentGateways";
import { WalletServices } from "./api-services/WalletServices";
import { VerificationServices } from "./api-services/VerificationServices";
import { UtilityPayments } from "./api-services/UtilityPayments";
import { TradeFinancing } from "./api-services/TradeFinancing";
import { BankStatements } from "./api-services/BankStatements";
import { FraudMonitoring } from "./api-services/FraudMonitoring";
import { ApiKeyManager } from "./ApiKeyManager";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Gauge, LineChart, BarChart, PieChart, Clock, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// Sample data for charts
const apiUsageData = [
  { name: 'Mon', count: 4000 },
  { name: 'Tue', count: 3000 },
  { name: 'Wed', count: 5000 },
  { name: 'Thu', count: 7000 },
  { name: 'Fri', count: 6000 },
  { name: 'Sat', count: 3500 },
  { name: 'Sun', count: 4500 },
];

export const ApiDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("overview");
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h2>
        <p className="text-muted-foreground">
          {t('dashboard.subtitle')}
        </p>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {t('common.messages.welcome', { name: profile?.full_name || 'User' })}
        </p>
        <div className="flex space-x-2">
          <Link to="/api-docs">
            <Button variant="outline" size="sm">
              <Info className="h-4 w-4 mr-2" />
              {t('api.documentation')}
            </Button>
          </Link>
          <Link to="/api-analytics">
            <Button variant="outline" size="sm">
              <LineChart className="h-4 w-4 mr-2" />
              {t('analytics.title')}
            </Button>
          </Link>
          <ApiKeyManager />
        </div>
      </div>

      <Tabs defaultValue="overview" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-8 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payment-gateways">Payments</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="utility-payments">Utilities</TabsTrigger>
          <TabsTrigger value="trade-financing">Trade Finance</TabsTrigger>
          <TabsTrigger value="bank-statements">Bank Statements</TabsTrigger>
          <TabsTrigger value="fraud-monitoring">Fraud Monitoring</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('dashboard.metrics.totalApiCalls')}</CardDescription>
                <CardTitle className="text-3xl font-bold">24,892</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground flex items-center">
                  <div className="mr-2 text-green-500">+8.2%</div>
                  <div>{t('dashboard.metrics.fromPreviousPeriod')}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('dashboard.metrics.activeApiKeys')}</CardDescription>
                <CardTitle className="text-3xl font-bold">4</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {t('dashboard.metrics.lastCreated', { days: 3 })}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('dashboard.metrics.averageResponseTime')}</CardDescription>
                <CardTitle className="text-3xl font-bold">187ms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground flex items-center">
                  <div className="mr-2 text-green-500">-12.5%</div>
                  <div>{t('dashboard.metrics.fromPreviousPeriod')}</div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <LineChart className="h-5 w-5 mr-2 text-primary" />
                      {t('dashboard.charts.apiUsageTrend')}
                    </CardTitle>
                    <CardDescription>{t('dashboard.charts.dailyApiRequests')}</CardDescription>
                  </div>
                  <Link to="/api-analytics">
                    <Button variant="ghost" size="sm" className="gap-1">
                      <span className="text-xs">Details</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={apiUsageData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#0088FE" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#0088FE"
                        fillOpacity={1}
                        fill="url(#colorCount)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Gauge className="h-5 w-5 mr-2 text-primary" />
                  {t('dashboard.charts.serviceHealth')}
                </CardTitle>
                <CardDescription>{t('dashboard.charts.currentStatus')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: t('dashboard.services.paymentGateways'), status: t('dashboard.status.operational'), uptime: '99.99%' },
                    { name: t('dashboard.services.bankStatementApi'), status: t('dashboard.status.operational'), uptime: '99.95%' },
                    { name: t('dashboard.services.verificationServices'), status: t('dashboard.status.degraded'), uptime: '98.76%' },
                    { name: t('dashboard.services.walletServices'), status: t('dashboard.status.operational'), uptime: '99.98%' },
                    { name: t('dashboard.services.fraudMonitoring'), status: t('dashboard.status.operational'), uptime: '99.92%' },
                  ].map((service, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="text-sm">{service.name}</div>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                          service.status === t('dashboard.status.operational') ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <div className="text-xs text-muted-foreground">{service.uptime}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2 text-primary" />
                  {t('dashboard.charts.serviceUsage')}
                </CardTitle>
                <CardDescription>{t('dashboard.charts.distributionByService')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: t('dashboard.services.paymentGateways'), percentage: 40 },
                    { name: t('dashboard.services.bankStatementApi'), percentage: 25 },
                    { name: t('dashboard.services.verificationServices'), percentage: 15 },
                    { name: t('dashboard.services.walletServices'), percentage: 12 },
                    { name: t('dashboard.services.fraudMonitoring'), percentage: 8 },
                  ].map((service, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{service.name}</span>
                        <span>{service.percentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300" 
                          style={{ width: `${service.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-primary" />
                  {t('dashboard.charts.recentActivity')}
                </CardTitle>
                <CardDescription>{t('dashboard.charts.latestApiInteractions')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { action: t('dashboard.activities.bankStatementRetrieved'), time: t('dashboard.time.minutesAgo', { count: 10 }), status: 'success' },
                    { action: t('dashboard.activities.paymentProcessed'), time: t('dashboard.time.minutesAgo', { count: 25 }), status: 'success' },
                    { action: t('dashboard.activities.idVerificationFailed'), time: t('dashboard.time.hourAgo', { count: 1 }), status: 'error' },
                    { action: t('dashboard.activities.walletBalanceChecked'), time: t('dashboard.time.hoursAgo', { count: 3 }), status: 'success' },
                    { action: t('dashboard.activities.newApiKeyCreated'), time: t('dashboard.time.dayAgo', { count: 1 }), status: 'success' },
                  ].map((activity, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                          activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span>{activity.action}</span>
                      </div>
                      <span className="text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-primary" />
                  {t('dashboard.charts.quickStats')}
                </CardTitle>
                <CardDescription>{t('dashboard.charts.keyMetricsGlance')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: t('dashboard.stats.successRate'), value: '99.7%' },
                    { label: t('dashboard.stats.averageLatency'), value: '187ms' },
                    { label: t('dashboard.stats.errorRate'), value: '0.3%' },
                    { label: t('dashboard.stats.throttledRequests'), value: '2.1%' },
                    { label: t('dashboard.stats.totalTransactions'), value: '$1.42M' },
                  ].map((stat, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                      <span className="text-sm font-medium">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="payment-gateways" className="space-y-4">
          <PaymentGateways />
        </TabsContent>
        
        <TabsContent value="wallet" className="space-y-4">
          <WalletServices />
        </TabsContent>
        
        <TabsContent value="verification" className="space-y-4">
          <VerificationServices />
        </TabsContent>
        
        <TabsContent value="utility-payments" className="space-y-4">
          <UtilityPayments />
        </TabsContent>
        
        <TabsContent value="trade-financing" className="space-y-4">
          <TradeFinancing />
        </TabsContent>
        
        <TabsContent value="bank-statements" className="space-y-4">
          <BankStatements />
        </TabsContent>
        
        <TabsContent value="fraud-monitoring" className="space-y-4">
          <FraudMonitoring />
        </TabsContent>
      </Tabs>
    </div>
  );
};
