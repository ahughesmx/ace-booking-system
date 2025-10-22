import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText, DollarSign, Hash, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { exportToCashCutPDF } from "@/utils/pdf-miniprinter";
import { formatCurrency } from "@/lib/utils";
import { getStartOfDateMexicoCityISO, getEndOfDateMexicoCityISO } from "@/utils/timezone";
import { toast } from "sonner";

interface CashCutSummary {
  cashTotal: number;
  bookingsCount: number;
  activeCount: number;
  cancelledCount: number;
  operatorName: string;
}

interface CashCutOperatorProps {
  operatorId?: string | null;
}

export function CashCutOperator({ operatorId }: CashCutOperatorProps = {}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState<CashCutSummary>({
    cashTotal: 0,
    bookingsCount: 0,
    activeCount: 0,
    cancelledCount: 0,
    operatorName: ''
  });

  const fetchCashCutData = async () => {
    if (!user && !operatorId) return;
    
    setLoading(true);
    try {
      const startOfDayUTC = getStartOfDateMexicoCityISO(selectedDate);
      const endOfDayUTC = getEndOfDateMexicoCityISO(selectedDate);

      const effectiveOperatorId = operatorId || user?.id;

      console.log('🧾 CashCut - Filtro:', {
        selectedDate,
        effectiveOperatorId,
        startOfDayUTC,
        endOfDayUTC
      });

      // Obtener nombre del operador
      const { data: operatorProfile, error: operatorError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', effectiveOperatorId)
        .single();

      if (operatorError) throw operatorError;

      // Obtener reservas procesadas por el operador en el día seleccionado
      const { data, error } = await supabase
        .from('bookings')
        .select('id, actual_amount_charged, amount, status, payment_completed_at')
        .in('payment_method', ['cash', 'efectivo'])
        .eq('processed_by', effectiveOperatorId)
        .gte('payment_completed_at', startOfDayUTC)
        .lte('payment_completed_at', endOfDayUTC);

      if (error) throw error;

      console.log('🧾 CashCut - Datos encontrados:', {
        count: data?.length || 0,
        data: data
      });

      const bookingsCount = data?.length || 0;
      const cashTotal = (data || []).reduce((sum, booking) => {
        const amount = booking.actual_amount_charged || booking.amount || 0;
        return sum + amount;
      }, 0);

      const activeCount = (data || []).filter(b => b.status === 'paid').length;
      const cancelledCount = (data || []).filter(b => b.status === 'cancelled').length;

      setSummary({
        cashTotal,
        bookingsCount,
        activeCount,
        cancelledCount,
        operatorName: operatorProfile?.full_name || 'Operador'
      });

    } catch (error) {
      console.error('Error fetching cash cut data:', error);
      toast.error('Error al cargar los datos del corte de caja');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashCutData();
  }, [selectedDate, user, operatorId]);

  const exportToCSV = () => {
    const headers = ['Operador', 'Fecha', 'Importe Ventanilla', 'Reservaciones Cobradas', 'Activas', 'Canceladas'];
    const csvData = [[
      summary.operatorName,
      format(new Date(selectedDate), 'dd/MM/yyyy', { locale: es }),
      formatCurrency(summary.cashTotal),
      summary.bookingsCount.toString(),
      summary.activeCount.toString(),
      summary.cancelledCount.toString()
    ]];

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `corte_caja_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exportado correctamente');
  };

  const exportToPDFReport = () => {
    exportToCashCutPDF({
      operatorName: summary.operatorName,
      date: format(new Date(selectedDate), 'dd/MM/yyyy', { locale: es }),
      cashTotal: summary.cashTotal,
      bookingsCount: summary.bookingsCount,
      activeCount: summary.activeCount,
      cancelledCount: summary.cancelledCount,
      fileName: `corte_caja_${selectedDate}.pdf`
    });
    toast.success('PDF generado correctamente');
  };

  if (!operatorId && !user) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>Debe iniciar sesión para ver el corte de caja</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="date">Fecha:</Label>
          <Input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm" disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={exportToPDFReport} variant="outline" size="sm" disabled={loading}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Cargando datos del corte de caja...
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="col-span-1 md:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Importe en Ventanilla
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(summary.cashTotal)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Total cobrado en efectivo
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Reservaciones Cobradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {summary.bookingsCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Total procesadas
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Reservas Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {summary.activeCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Vigentes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Reservas Canceladas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {summary.cancelledCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Sin devolución
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && summary.bookingsCount === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay transacciones en ventanilla para la fecha seleccionada</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
