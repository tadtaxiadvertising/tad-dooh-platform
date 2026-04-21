import React from 'react';
import { Download, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const BillingPortal = () => {
  // Mock data for the finance portal table
  const invoices = [
    { id: 'INV-2026-003', issueDate: '2026-04-01', dueDate: '2026-04-15', amount: 45000.00, status: 'PENDING' },
    { id: 'INV-2026-002', issueDate: '2026-03-01', dueDate: '2026-03-15', amount: 45000.00, status: 'PAID' },
    { id: 'INV-2026-001', issueDate: '2026-02-01', dueDate: '2026-02-15', amount: 45000.00, status: 'PAID' },
    { id: 'INV-2025-012', issueDate: '2025-12-01', dueDate: '2025-12-15', amount: 15000.00, status: 'OVERDUE' },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(value);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PAID':
        return { label: 'Pagado', classes: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 };
      case 'PENDING':
        return { label: 'Pendiente', classes: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Clock };
      case 'OVERDUE':
        return { label: 'Vencido', classes: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle };
      default:
        return { label: status, classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: FileText };
    }
  };

  const handleDownloadPdf = (id: string) => {
    console.log(`Downloading PDF for invoice ${id}`);
    // Simulate action
  };

  return (
    <div className="bg-[#09090B] rounded-2xl border border-[#18181B] text-[#F4F4F5] overflow-hidden">
      <div className="p-6 border-b border-[#18181B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Portal de Finanzas</h2>
          <p className="text-sm text-[#F4F4F5]/60 mt-1">Historial de facturación y pagos mensuales</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#18181B] text-[#F4F4F5]/60 font-medium">
            <tr>
              <th className="px-6 py-4 rounded-tl-lg">Factura ID</th>
              <th className="px-6 py-4">F. Emisión</th>
              <th className="px-6 py-4">Vencimiento</th>
              <th className="px-6 py-4 text-right">Monto</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-right rounded-tr-lg">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18181B]">
            {invoices.map((invoice) => {
              const statusConfig = getStatusConfig(invoice.status);
              const StatusIcon = statusConfig.icon;

              return (
                <tr key={invoice.id} className="hover:bg-[#18181B]/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-[#F4F4F5]/90">{invoice.id}</td>
                  <td className="px-6 py-4 text-[#F4F4F5]/70">{invoice.issueDate}</td>
                  <td className="px-6 py-4 text-[#F4F4F5]/70">{invoice.dueDate}</td>
                  <td className="px-6 py-4 text-right font-mono font-medium text-[#FFD700]">
                    {formatCurrency(invoice.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.classes}`}>
                        <StatusIcon size={14} />
                        {statusConfig.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDownloadPdf(invoice.id)}
                      className="inline-flex items-center justify-center p-2 rounded-lg text-[#F4F4F5]/70 hover:text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors"
                      title="Descargar PDF"
                    >
                      <Download size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
