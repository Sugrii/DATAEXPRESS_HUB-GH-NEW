import React from 'react';
import { SubMerchant, TelecomOrder, PayoutRecord } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp, Users, DollarSign, Award, ArrowUpRight } from 'lucide-react';

interface CommissionAnalyticsProps {
  agents: SubMerchant[];
  orders: TelecomOrder[];
  payouts: PayoutRecord[];
}

export const CommissionAnalytics: React.FC<CommissionAnalyticsProps> = ({
  agents,
  orders,
  payouts,
}) => {
  // Aggregate sales by network
  const networkBreakdown = [
    {
      network: 'MTN',
      ordersCount: orders.filter((o) => o.network === 'MTN').length,
      volumeGhs: orders.filter((o) => o.network === 'MTN').reduce((s, o) => s + o.amountGhs, 0),
      commissionsGhs: orders.filter((o) => o.network === 'MTN').reduce((s, o) => s + (o.commissionGhs || 0), 0),
      color: '#eab308',
    },
    {
      network: 'Telecel',
      ordersCount: orders.filter((o) => o.network === 'TELECEL').length,
      volumeGhs: orders.filter((o) => o.network === 'TELECEL').reduce((s, o) => s + o.amountGhs, 0),
      commissionsGhs: orders.filter((o) => o.network === 'TELECEL').reduce((s, o) => s + (o.commissionGhs || 0), 0),
      color: '#ef4444',
    },
    {
      network: 'AT',
      ordersCount: orders.filter((o) => o.network === 'AIRTELTIGO').length,
      volumeGhs: orders.filter((o) => o.network === 'AIRTELTIGO').reduce((s, o) => s + o.amountGhs, 0),
      commissionsGhs: orders.filter((o) => o.network === 'AIRTELTIGO').reduce((s, o) => s + (o.commissionGhs || 0), 0),
      color: '#3b82f6',
    },
  ];

  // Top sub-merchants leaderboard
  const sortedAgents = [...agents].sort((a, b) => b.totalSalesVolume - a.totalSalesVolume);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            Revenue & Commission Analytics
          </div>
          <h2 className="text-xl font-bold text-white">Carrier Performance & Partner Earnings</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Realtime metrics across MTN Ghana, Telecel, and AirtelTigo carrier switches
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Volume Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center justify-between">
            <span>Sales Volume by Carrier (GHS)</span>
            <span className="text-xs font-normal text-slate-400">Total: GHS {orders.reduce((s, o) => s + o.amountGhs, 0).toFixed(2)}</span>
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={networkBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="network" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="volumeGhs" name="Volume (GHS)" radius={[8, 8, 0, 0]}>
                  {networkBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Commissions Breakdown Pie */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center justify-between">
            <span>Commission Yield by Network</span>
            <span className="text-xs font-normal text-amber-400">Hubtel Direct</span>
          </h3>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={networkBreakdown}
                  dataKey="commissionsGhs"
                  nameKey="network"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {networkBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Resellers Leaderboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Top Performing Sub-Merchant Partners
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedAgents.slice(0, 3).map((agent, index) => (
            <div
              key={agent.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <span className="text-2xl font-black text-slate-700">#{index + 1}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                  {agent.commissionRate}% Rate
                </span>
              </div>

              <div className="mt-3">
                <div className="font-bold text-sm text-white">{agent.businessName}</div>
                <div className="text-xs text-slate-400 mt-0.5">{agent.name}</div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-end font-mono">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Sales Volume</div>
                  <div className="text-xs font-bold text-slate-200">GHS {agent.totalSalesVolume.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-emerald-500 uppercase">Earned</div>
                  <div className="text-xs font-bold text-emerald-400">GHS {agent.totalCommissionEarned.toFixed(2)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
