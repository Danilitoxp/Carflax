import { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Key,
  User,
  CheckCircle2,
  Clock, 
  AlertCircle,
  Plus,
  Search,
  Calendar,
  Wrench,
  Flame,
  ArrowRight,
  ChevronRight,
  Ticket,
  Printer,
  Copy,
  Share2,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiCrmAlugueisClientes, apiGeraPix, apiCancelaPix, API_BASE } from "@/lib/api";
import type { PixResponse } from "@/lib/api";

import { supabase } from "@/lib/supabase";
import { QRCodeCanvas } from "qrcode.react";


interface Rental {
  id: string;
  machineId: string;
  machineName: string;
  clientName: string;
  value: number;
  dailyValue: number;
  startDate: string;
  endDate?: string;
  paymentStatus: "paid" | "pending";
  salesperson: string;
  status: "active" | "completed" | "overdue";
}

interface Machine {
  id: string;
  name: string;
  model: string;
  status: "available" | "rented" | "maintenance";
  image?: string;
  currentRental?: Rental;
  defaultPrice?: number;
}


interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  department?: string;
  operator_code?: string;
  operatorCode?: string;
  permissions?: string[];
  is_admin?: boolean;
}

interface AlugueisViewProps {
  userProfile?: UserProfile;
}

export function AlugueisView({ userProfile }: AlugueisViewProps) {
  const [machines, setMachines] = useState<Machine[]>([
    {
      id: "TRM20905",
      name: "Termofusora Grande",
      model: "75 a 110mm (220V)",
      status: "available",
      image: "https://casadosoldador.com.br/files/products_images/33231/termofusora-1200w-p-tubos-ppr-75-a-110mm-220v-top-fusion-casa-do-soldador-1%20(1).webp?1691430838",
      defaultPrice: 200.00
    },
    {
      id: "TRM20633",
      name: "Termofusora Pequena",
      model: "20 a 63mm (220V)",
      status: "available",
      image: "https://images.tcdn.com.br/img/img_prod/1100542/90_termofusora_ppr_6_bocais_20_a_63mm_800w_220v_trm20633_topfusion_12979_2_786e8cd03e10868e40be143611963701.jpg",
      defaultPrice: 150.00
    }
  ]);
  const [history, setHistory] = useState<Rental[]>([]);
  const [showNewRentalModal, setShowNewRentalModal] = useState(false);
  const [selectedRentalForCoupon, setSelectedRentalForCoupon] = useState<Rental | null>(null);
  const [printServerUrl, setPrintServerUrl] = useState(() => {
    return localStorage.getItem('carflax_print_server_url') || 'http://192.168.10.161:3002';
  });
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState(() => {
    return localStorage.getItem('carflax_selected_printer') || '80mm Series Printer';
  });
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const checkServerConnection = useCallback(async (serverUrl: string) => {
    setServerStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${serverUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        setServerStatus('online');
        const printerController = new AbortController();
        const printerTimeoutId = setTimeout(() => printerController.abort(), 3000);
        const printersRes = await fetch(`${serverUrl}/printers`, { signal: printerController.signal });
        clearTimeout(printerTimeoutId);

        if (printersRes.ok) {
          const data = await printersRes.json();
          if (data.ok && Array.isArray(data.printers)) {
            setPrinters(data.printers);
            
            // Auto-select coupon printer logic
            const storedPrinter = localStorage.getItem('carflax_selected_printer');
            if (storedPrinter && data.printers.includes(storedPrinter)) {
              setSelectedPrinter(storedPrinter);
            } else {
              // Try to find a printer that looks like a coupon printer (e.g. has 80mm, pos, thermal, cupom in name)
              const couponPrinter = data.printers.find((p: string) => {
                const name = p.toLowerCase();
                return name.includes('80mm') || name.includes('cupom') || name.includes('thermal') || name.includes('pos');
              });
              
              if (couponPrinter) {
                setSelectedPrinter(couponPrinter);
                localStorage.setItem('carflax_selected_printer', couponPrinter);
              } else if (data.printers.length > 0) {
                setSelectedPrinter(data.printers[0]);
                localStorage.setItem('carflax_selected_printer', data.printers[0]);
              }
            }
            return;
          }
        }
        setPrinters([]);
      } else {
        setServerStatus('offline');
        setPrinters([]);
      }
    } catch (err) {
      console.warn("PrintServer offline:", err);
      setServerStatus('offline');
      setPrinters([]);
    }
  }, []);

  const printRentalViaServer = useCallback(async (rental: Rental) => {
    const url = printServerUrl;
    const targetPrinter = selectedPrinter;
    try {
      const response = await fetch(`${url}/imprimir-aluguel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rental.id,
          machineId: rental.machineId,
          machineName: rental.machineName,
          clientName: rental.clientName,
          startDate: rental.startDate,
          endDate: rental.endDate,
          salesperson: rental.salesperson,
          dailyValue: rental.dailyValue,
          value: rental.value,
          paymentStatus: rental.paymentStatus,
          printer: targetPrinter
        })
      });
      if (!response.ok) {
        throw new Error(`Servidor retornou status ${response.status}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido');
      }
      return true;
    } catch (err) {
      console.error("Erro ao imprimir via servidor:", err);
      throw err;
    }
  }, [printServerUrl, selectedPrinter]);

  useEffect(() => {
    if (selectedRentalForCoupon) {
      checkServerConnection(printServerUrl);
    }
  }, [selectedRentalForCoupon, printServerUrl, checkServerConnection]);

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [search, setSearch] = useState("");
  const [dailyValue, setDailyValue] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  const [isWaitingPayment, setIsWaitingPayment] = useState(false);
  const [isProcessingPreference, setIsProcessingPreference] = useState(false);
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("ATIVA");

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configMachines, setConfigMachines] = useState<Machine[]>([]);

  const isUserAdmin = userProfile ? (
    userProfile.role?.toUpperCase() === "ADMIN" ||
    userProfile.role?.toUpperCase() === "TI" ||
    userProfile.role?.toUpperCase().includes("DIRETOR") || 
    userProfile.is_admin
  ) : false;

  const handleSaveConfigs = async () => {
    try {
      const { error } = await supabase
        .from("crm_config")
        .upsert({
          key: "crm_rental_machines",
          value: JSON.stringify(configMachines.map(m => ({
            id: m.id,
            name: m.name,
            model: m.model,
            image: m.image,
            defaultPrice: m.defaultPrice
          })))
        });

      if (error) throw error;

      setMachines(prev => prev.map(m => {
        const match = configMachines.find(x => x.id === m.id);
        if (match) {
          return {
            ...m,
            name: match.name,
            model: match.model,
            image: match.image,
            defaultPrice: match.defaultPrice
          };
        }
        return m;
      }));

      setShowConfigModal(false);
      alert("Configurações das termofusoras salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      alert("Não foi possível salvar as configurações.");
    }
  };

  useEffect(() => {
    if (showConfigModal) {
      setConfigMachines(JSON.parse(JSON.stringify(machines)));
    }
  }, [showConfigModal, machines]);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const { data } = await supabase
          .from("crm_config")
          .select("value")
          .eq("key", "crm_rental_machines")
          .maybeSingle();

        if (data?.value) {
          interface MachineConfig {
            id: string;
            name?: string;
            model?: string;
            image?: string;
            defaultPrice?: number;
          }
          const loadedMachines = JSON.parse(data.value) as MachineConfig[];
          setMachines(prev => prev.map(m => {
            const match = loadedMachines.find((x) => x.id === m.id);
            if (match) {
              return {
                ...m,
                name: match.name || m.name,
                model: match.model || m.model,
                image: match.image || m.image,
                defaultPrice: typeof match.defaultPrice === 'number' ? match.defaultPrice : m.defaultPrice
              };
            }
            return m;
          }));
        }
      } catch (err) {
        console.error("Erro ao carregar configurações das termofusoras:", err);
      }
    };
    fetchConfigs();
  }, []);


  const resetForm = useCallback(() => {
    setSearch("");
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate("");
    setSelectedMachine(null);
    setDailyValue("");
    setPaymentLink("");
    setIsWaitingPayment(false);
    setIsProcessingPreference(false);
    setPixData(null);
    setPaymentStatus("ATIVA");
  }, []);


  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const data = await apiCrmAlugueisClientes();
      setClients(data);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crm_alugueis')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        // Map DB fields to Rental interface if necessary
        const mappedData: Rental[] = data.map(item => ({
          id: item.id,
          machineId: item.machine_id,
          machineName: item.machine_name,
          clientName: item.client_name,
          value: item.total_value,
          dailyValue: item.daily_value,
          startDate: item.start_date,
          endDate: item.end_date,
          paymentStatus: item.payment_status,
          salesperson: item.salesperson,
          status: item.status
        }));
        setHistory(mappedData);

        // Also update machines status based on active rentals
        const activeRentals = mappedData.filter(r => r.status === 'active');
        setMachines(prev => prev.map(m => {
          const rental = activeRentals.find(r => r.machineId === m.id);
          if (rental) {
            return { ...m, status: 'rented', currentRental: rental };
          }
          return { ...m, status: 'available', currentRental: undefined };
        }));
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    }
  }, [setHistory, setMachines]);

  useEffect(() => {
    loadHistory();

    // Listen for new rentals to automatically close payment modal
    const channel = supabase
      .channel('public:crm_alugueis')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_alugueis' }, async (payload) => {
        console.log('Novo aluguel detectado:', payload);
        loadHistory();
        setShowNewRentalModal(false);
        resetForm();

        // Print automatically if print server is configured and payload is valid
        if (payload.new) {
          const rentalItem: Rental = {
            id: payload.new.id,
            machineId: payload.new.machine_id,
            machineName: payload.new.machine_name,
            clientName: payload.new.client_name,
            startDate: payload.new.start_date,
            endDate: payload.new.end_date || undefined,
            salesperson: payload.new.salesperson,
            dailyValue: Number(payload.new.daily_value || 0),
            value: Number(payload.new.total_value || 0),
            paymentStatus: payload.new.payment_status,
            status: payload.new.status
          };
          try {
            await printRentalViaServer(rentalItem);
          } catch (err) {
            console.error("Erro ao imprimir cupom automaticamente:", err);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadHistory, resetForm, printRentalViaServer]);

  const totalCalculation = useMemo(() => {
    if (!startDate || !endDate || !dailyValue) return { days: 0, total: 0 };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const days = diffDays > 0 ? diffDays : 0;
    const daily = parseFloat(dailyValue.replace(',', '.'));
    return {
      days,
      total: days * daily
    };
  }, [startDate, endDate, dailyValue]);

  const saveRentalToDb = useCallback(async () => {
    if (!selectedMachine || !search || !startDate || !endDate) return;

    try {
      const { error } = await supabase
        .from('crm_alugueis')
        .insert([{
          machine_id: selectedMachine.id,
          machine_name: selectedMachine.name,
          client_name: search,
          start_date: startDate,
          end_date: endDate,
          daily_value: parseFloat(dailyValue.replace(',', '.')),
          total_value: totalCalculation.total,
          payment_status: "paid",
          salesperson: userProfile?.name || "Danilo",
          status: "active"
        }]);

      if (error) throw error;
      // The INSERT listener will handle closing the modal and refreshing
    } catch (err) {
      console.error("Erro ao salvar aluguel no banco:", err);
      alert("Pagamento confirmado, mas erro ao registrar no banco.");
    }
  }, [selectedMachine, search, startDate, endDate, dailyValue, totalCalculation.total, userProfile?.name]);

  const handleManualConfirm = async () => {
    try {
      setPaymentStatus("CONCLUIDA");
      await saveRentalToDb();
    } catch (err) {
      console.error("Erro ao confirmar pagamento manualmente:", err);
    }
  };

  useEffect(() => {
    let controller: AbortController | null = null;

    if (isWaitingPayment && pixData && paymentStatus !== "CONCLUIDA") {
      controller = new AbortController();
      
      const startListening = async () => {
        try {
          const baseUrl = API_BASE.startsWith("http") ? API_BASE : window.location.origin + API_BASE;
          const url = `${baseUrl}/api/pix/consulta_cobranca_pix?codigoEmpresa=${pixData.empresaPix}&txIdPix=${pixData.txidPix}`;
          const response = await fetch(url, {
            headers: { "accept": "application/json" },
            signal: controller?.signal
          });

          if (!response.body) return;
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            console.log("Pix Stream Chunk:", chunk);

            // Tenta extrair o status do evento SSE (formato event:status \n data:{"status":"..."})
            if (chunk.includes('"status":"CONCLUIDA"') || chunk.includes('"status":"PAGO"')) {
              setPaymentStatus("CONCLUIDA");
              await saveRentalToDb();
              break; 
            } else {
              const statusMatch = chunk.match(/"status":"(.*?)"/);
              if (statusMatch && statusMatch[1]) {
                setPaymentStatus(statusMatch[1]);
              }
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name !== 'AbortError') {
            console.error("Erro ao monitorar Pix:", err);
          }
        }
      };

      startListening();
    }

    return () => {
      if (controller) controller.abort();
    };
  }, [isWaitingPayment, pixData, paymentStatus, saveRentalToDb]);


  useEffect(() => {
    if (showNewRentalModal) {
      loadClients();
    }
  }, [showNewRentalModal, loadClients]);

  const handleConfirmRental = useCallback(async () => {
    if (!selectedMachine || !search || !startDate || !endDate) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    setIsProcessingPreference(true);
    try {
      const selectedClient = clients.find(c => c.label === search);
      const codigoCliente = selectedClient ? selectedClient.value : "00000003";

      const response = await apiGeraPix({
        codigoCliente: codigoCliente,
        solicitacaoPagador: `ALUGUEL ${selectedMachine.name} - ${search}`,
        valor: totalCalculation.total
      });

      setPixData(response);
      setPaymentLink(response.textoQrCode);
      setIsWaitingPayment(true);
      
    } catch (err) {
      console.error("Erro ao gerar Pix:", err);
      alert("Erro ao gerar Pix. Tente novamente.");
    } finally {
      setIsProcessingPreference(false);
    }
  }, [selectedMachine, search, startDate, endDate, totalCalculation.total, clients]);

  const handleCancelPix = useCallback(async () => {
    if (!pixData) return;
    
    try {
      await apiCancelaPix(pixData.empresaPix, pixData.txidPix);
      setIsWaitingPayment(false);
      setPixData(null);
      setPaymentStatus("ATIVA");
    } catch (err) {
      console.error("Erro ao cancelar Pix:", err);
      alert("Erro ao cancelar cobrança no servidor.");
      // Even if server fails, we might want to allow user to go back
      setIsWaitingPayment(false);
    }
  }, [pixData]);


  const handleFinishRental = useCallback(async (machineId: string, rentalId?: string) => {
    if (!rentalId) return;

    const machine = machines.find(m => m.id === machineId);
    if (!machine || !machine.currentRental) return;

    const r = machine.currentRental;

    try {
      const { error } = await supabase
        .from('crm_alugueis')
        .upsert({ 
          id: r.id,
          machine_id: machine.id,
          machine_name: r.machineName,
          client_name: r.clientName,
          total_value: r.value,
          daily_value: r.dailyValue,
          start_date: r.startDate,
          end_date: r.endDate,
          payment_status: r.paymentStatus,
          salesperson: r.salesperson,
          status: 'completed'
        });

      if (error) throw error;

      setMachines(prev => prev.map(m => 
        m.id === machineId 
          ? { ...m, status: "available", currentRental: undefined } 
          : m
      ));

      // Re-fetch history to show completed status
      loadHistory();
    } catch (err) {
      console.error("Erro ao finalizar aluguel:", err);
      alert("Erro ao atualizar no banco de dados.");
    }
  }, [setMachines, loadHistory, machines]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.label.toLowerCase().includes(search.toLowerCase()) || 
      c.value.toString().includes(search)
    ).slice(0, 5);
  }, [clients, search]);

  const stats = useMemo(() => {
    return {
      available: machines.filter(m => m.status === "available").length,
      rented: machines.filter(m => m.status === "rented").length,
      maintenance: machines.filter(m => m.status === "maintenance").length,
      pendingPayments: machines.reduce((acc, m) => acc + (m.currentRental?.paymentStatus === "pending" ? 1 : 0), 0)
    };
  }, [machines]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-[#020617] p-4 space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-1">Aluguéis</h1>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">Controle de Equipamentos</p>
        </div>
        <div className="flex items-center gap-2">
          {isUserAdmin && (
            <button 
              onClick={() => setShowConfigModal(true)}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
            >
              <Settings className="w-3.5 h-3.5" />
              Configurar
            </button>
          )}
          <button 
            onClick={() => setShowNewRentalModal(true)}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Aluguel
          </button>
        </div>
      </div>

      {/* Stats - More Compact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "Disponíveis", value: stats.available, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Em Uso", value: stats.rented, icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Manutenção", value: stats.maintenance, icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", stat.bg, "dark:bg-opacity-10")}>
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">{stat.label}</span>
              <span className="text-sm font-black text-slate-900 dark:text-white leading-none">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Machines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {machines.map((machine) => (
          <div key={machine.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
            {/* Machine Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                  {machine.image ? (
                    <img src={machine.image} alt={machine.name} className="w-full h-full object-cover" />
                  ) : (
                    <Flame className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{machine.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase">{machine.id}</span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{machine.model}</span>
                  </div>
                </div>
              </div>
              <div className={cn(
                "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                machine.status === "available" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                machine.status === "rented" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                "bg-amber-500/10 text-amber-500 border-amber-500/20"
              )}>
                {machine.status === "available" ? "Disponível" : 
                 machine.status === "rented" ? "Alugado" : "Manutenção"}
              </div>
            </div>

            {/* Machine Body */}
            <div className="p-4">
              {machine.status === "rented" && machine.currentRental ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Cliente Atual</span>
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-black text-slate-900 dark:text-white">{machine.currentRental.clientName}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Início</span>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {new Date(machine.currentRental.startDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Vendedor</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-primary/10 flex items-center justify-center text-[7px] font-black text-primary uppercase">
                          {machine.currentRental.salesperson[0]}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{machine.currentRental.salesperson}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900 dark:bg-slate-950 rounded-xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em]">Total do Aluguel</span>
                      <span className="text-sm font-black text-white">
                        R$ {machine.currentRental.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      disabled={machine.currentRental.salesperson !== userProfile?.name}
                      onClick={() => handleFinishRental(machine.id, machine.currentRental?.id)}
                      className={cn(
                        "flex-1 py-2 border rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors",
                        machine.currentRental.salesperson === userProfile?.name
                          ? "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          : "border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50"
                      )}
                    >
                      {machine.currentRental.salesperson === userProfile?.name ? "Finalizar" : "Bloqueado (Vendedor)"}
                    </button>
                    <button 
                      onClick={() => setSelectedRentalForCoupon(machine.currentRental!)}
                      className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                      title="Ver Cupom / Imprimir"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : machine.status === "available" ? (
                <div className="h-[180px] flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Pronto para uso</h4>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Nenhum aluguel ativo.</p>
                  </div>
                  <button 
                    onClick={() => { 
                      setSelectedMachine(machine); 
                      setDailyValue(machine.defaultPrice !== undefined ? machine.defaultPrice.toFixed(2).replace('.', ',') : (machine.id === "TRM20633" ? "150,00" : "200,00"));
                      setShowNewRentalModal(true); 
                    }}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 group/btn"
                  >
                    Alugar agora
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              ) : (
                <div className="h-[180px] flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Manutenção</h4>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Indisponível temporariamente.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* History Section - New */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Histórico Recente</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Equipamento</th>
                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-left">Período</th>
                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-left">Vendedor</th>
                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.length > 0 ? history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{item.machineId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{item.clientName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                      {new Date(item.startDate).toLocaleDateString('pt-BR')} - {item.endDate ? new Date(item.endDate).toLocaleDateString('pt-BR') : '...'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">
                      {item.salesperson}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[10px] font-black text-slate-900 dark:text-white">
                      R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                      item.status === "active" ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500"
                    )}>
                      {item.status === "active" ? "Em andamento" : "Concluído"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => setSelectedRentalForCoupon(item)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center"
                      title="Ver Cupom / Imprimir"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum histórico encontrado</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Rental Modal (Placeholder for the idea) */}
      {showNewRentalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className={cn(
            "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full flex overflow-hidden transition-all duration-500",
            isWaitingPayment ? "max-w-3xl" : "max-w-sm"
          )}>
            {/* Left Column: Form */}
            <div className={cn(
              "w-full max-w-sm flex flex-col shrink-0 transition-opacity duration-500",
              isWaitingPayment && "opacity-40 pointer-events-none"
            )}>
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Key className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Novo Registro</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Aluguel de Equipamento</p>
                  </div>
                </div>
                {!isWaitingPayment && (
                  <button 
                    onClick={() => { setShowNewRentalModal(false); resetForm(); }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5 rotate-45 text-slate-400" />
                  </button>
                )}
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Equipamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      {machines.map(m => (
                        <button
                          key={m.id}
                          disabled={m.status !== "available"}
                          onClick={() => {
                            setSelectedMachine(m);
                            setDailyValue(m.defaultPrice !== undefined ? m.defaultPrice.toFixed(2).replace('.', ',') : (m.id === "TRM20633" ? "150,00" : "200,00"));
                          }}
                          className={cn(
                            "p-2 rounded-xl border flex items-center gap-2 transition-all text-left relative",
                            selectedMachine?.id === m.id 
                              ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white shadow-md" 
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 hover:bg-slate-100",
                            m.status !== "available" && "opacity-50 cursor-not-allowed grayscale"
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 border border-slate-100 dark:border-slate-700">
                            <img src={m.image} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={cn(
                              "text-[10px] font-black uppercase leading-none truncate",
                              selectedMachine?.id === m.id ? "text-white dark:text-slate-900" : "text-slate-900 dark:text-white"
                            )}>
                              {m.name.split(' ')[1]}
                            </span>
                            <span className={cn(
                              "text-[8px] font-bold uppercase tracking-tighter truncate",
                              selectedMachine?.id === m.id ? "text-white/60 dark:text-slate-500" : "text-slate-400"
                            )}>
                              {m.status === 'available' ? m.id : 'INDISPONÍVEL'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cliente</label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Pesquisar cliente..." 
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary/50 transition-all text-slate-900 dark:text-white"
                      />
                      
                      {showDropdown && search && filteredClients.length > 0 && (
                        <div className="absolute z-10 w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
                          {filteredClients.map((client) => (
                            <div 
                              key={client.value}
                              onClick={() => { 
                                setSearch(client.label); 
                                setShowDropdown(false);
                              }}
                              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between group"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900 dark:text-white">{client.label}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{client.value}</span>
                              </div>
                              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors" />
                            </div>
                          ))}
                        </div>
                      )}

                      {loadingClients && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Retirada</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-2 py-2 text-xs font-bold outline-none focus:border-primary/50 transition-all text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Entrega</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                          type="date" 
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-2 py-2 text-xs font-bold outline-none focus:border-primary/50 transition-all text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Valor da Diária</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300">R$ {dailyValue || "0,00"}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Duração</span>
                          <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">{totalCalculation.days} {totalCalculation.days === 1 ? 'dia' : 'dias'}</span>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-[0.15em]">Total a Pagar</span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          R$ {totalCalculation.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {!isWaitingPayment && (
                  <button 
                    onClick={handleConfirmRental}
                    disabled={isProcessingPreference}
                    className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessingPreference && <div className="w-3 h-3 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full animate-spin" />}
                    Gerar Pagamento
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Pix */}
            {isWaitingPayment && (
              <div className="flex-1 border-l border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 flex flex-col animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Pagamento Pix</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Aguardando Recebimento</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setShowNewRentalModal(false); resetForm(); }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5 rotate-45 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Escaneie para Pagar</p>
                    <div className="p-3 bg-white rounded-xl shadow-inner">
                      <QRCodeCanvas value={paymentLink} size={150} />
                    </div>
                    <div className="flex flex-col items-center gap-2 mt-4">
                      <div className="flex items-center gap-2">
                        {paymentStatus !== "CONCLUIDA" && (
                          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        )}
                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 text-center">
                          {paymentStatus === "CONCLUIDA" ? "Pagamento Confirmado!" : "Aguardando confirmação..."}
                        </p>
                      </div>
                      <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest">
                        Status: {paymentStatus}
                      </span>
                    </div>
                    <div className="mt-2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          paymentStatus === "CONCLUIDA" ? "bg-emerald-500 w-full" : "bg-primary animate-[shimmer_2s_infinite_linear] w-[40%]"
                        )} 
                      />
                    </div>
                  </div>

                  {paymentStatus !== "CONCLUIDA" && (
                    <div className="space-y-2 mt-auto">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(paymentLink);
                          alert("Código Pix Copiado!");
                        }}
                        className="w-full py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        Copiar Código Pix
                      </button>
                      <button 
                        onClick={handleManualConfirm}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        Pagamento Efetuado
                      </button>
                      <button 
                        onClick={handleCancelPix}
                        className="w-full py-2 text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-red-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3 rotate-45" />
                        Cancelar Cobrança
                      </button>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => setIsWaitingPayment(false)}
                    className="w-full py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Voltar e Editar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {selectedRentalForCoupon && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden transition-all duration-300 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Ticket className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Comprovante de Aluguel</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Visualização do Cupom</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRentalForCoupon(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5 rotate-45 text-slate-400" />
              </button>
            </div>

            {/* Modal Body: Receipt style */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto max-h-[60vh] flex flex-col items-center justify-center">
              <div 
                id="print-coupon-area" 
                className="bg-white text-black p-5 border border-dashed border-slate-300 rounded-lg shadow-inner w-full max-w-[280px] font-mono text-[10px] relative"
              >
                {/* Serrated Edges */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[linear-gradient(45deg,transparent_33.333%,#f1f5f9_33.333%,#f1f5f9_66.667%,transparent_66.667%)] bg-[length:6px_6px] pointer-events-none" />
                
                {/* Header */}
                <div className="text-center space-y-1 mb-4 pt-2">
                  <h2 className="text-xs font-black tracking-widest uppercase">CARFLAX HUB</h2>
                  <p className="text-[8px] uppercase text-slate-500 font-bold">Controle de Aluguéis</p>
                  <p className="text-[8px] text-slate-400">Emissão: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  <div className="border-b border-dashed border-slate-300 my-2" />
                  <p className="text-[9px] font-black tracking-wider uppercase">CUPOM DE ALUGUEL</p>
                  <p className="text-[8px] text-slate-500 truncate"># {selectedRentalForCoupon.id}</p>
                </div>

                {/* Details */}
                <div className="space-y-2 leading-tight">
                  <div className="flex flex-col border-b border-dashed border-slate-200 pb-1.5">
                    <span className="text-[7px] uppercase text-slate-400 font-bold tracking-wider">Cliente</span>
                    <span className="font-bold uppercase break-words text-[9px]">{selectedRentalForCoupon.clientName}</span>
                  </div>

                  <div className="flex flex-col border-b border-dashed border-slate-200 pb-1.5">
                    <span className="text-[7px] uppercase text-slate-400 font-bold tracking-wider">Equipamento</span>
                    <span className="font-bold uppercase text-[9px]">{selectedRentalForCoupon.machineName}</span>
                    <span className="text-[7px] text-slate-500 font-bold">ID: {selectedRentalForCoupon.machineId}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-b border-dashed border-slate-200 pb-1.5">
                    <div>
                      <span className="text-[7px] uppercase text-slate-400 font-bold tracking-wider block">Retirada</span>
                      <span className="font-bold">{new Date(selectedRentalForCoupon.startDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div>
                      <span className="text-[7px] uppercase text-slate-400 font-bold tracking-wider block">Devolução</span>
                      <span className="font-bold">
                        {selectedRentalForCoupon.endDate 
                          ? new Date(selectedRentalForCoupon.endDate).toLocaleDateString('pt-BR') 
                          : 'A definir'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-b border-dashed border-slate-200 pb-1.5">
                    <div>
                      <span className="text-[7px] uppercase text-slate-400 font-bold tracking-wider block">Vendedor</span>
                      <span className="font-bold uppercase truncate block">{selectedRentalForCoupon.salesperson}</span>
                    </div>
                    <div>
                      <span className="text-[7px] uppercase text-slate-400 font-bold tracking-wider block">Duração</span>
                      <span className="font-bold">
                        {selectedRentalForCoupon.endDate 
                          ? `${Math.ceil((new Date(selectedRentalForCoupon.endDate).getTime() - new Date(selectedRentalForCoupon.startDate).getTime()) / (1000 * 60 * 60 * 24))} dias`
                          : 'Pendente'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between">
                      <span className="text-[8px] uppercase text-slate-500">Valor da Diária:</span>
                      <span className="font-bold">R$ {selectedRentalForCoupon.dailyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-dashed border-slate-300">
                      <span className="font-black uppercase text-[8px]">Total do Aluguel:</span>
                      <span className="font-black text-[11px]">R$ {selectedRentalForCoupon.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[8px] uppercase text-slate-500">Pagamento:</span>
                      <span className={`px-1 rounded text-[7px] font-black uppercase ${
                        selectedRentalForCoupon.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedRentalForCoupon.paymentStatus === 'paid' ? 'PAGO' : 'PENDENTE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulated Barcode */}
                <div className="border-t border-dashed border-slate-300 mt-4 pt-3 flex flex-col items-center">
                  <div className="flex justify-center items-center gap-0.5 h-6 w-full bg-white px-2">
                    {[1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 1, 2, 1, 3, 2, 1, 4].map((w, idx) => (
                      <div 
                        key={idx} 
                        className="bg-black h-5 shrink-0" 
                        style={{ width: `${w}px` }} 
                      />
                    ))}
                  </div>
                  <span className="text-[6px] text-slate-400 mt-1 uppercase tracking-widest">Obrigado pela preferência!</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col gap-2">
              <div className="flex flex-col gap-1 px-1 mb-1">
                <div className="flex items-center justify-between">
                  <label className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Servidor de Impressão</label>
                  <div className="flex items-center gap-1">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      serverStatus === 'online' ? 'bg-emerald-500' :
                      serverStatus === 'offline' ? 'bg-rose-500' :
                      'bg-amber-500 animate-pulse'
                    )} />
                    <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                      {serverStatus === 'online' ? 'Conectado' :
                       serverStatus === 'offline' ? 'Desconectado' :
                       'Checando...'}
                    </span>
                  </div>
                </div>
                <input 
                  type="text" 
                  value={printServerUrl}
                  onChange={(e) => {
                    setPrintServerUrl(e.target.value);
                    localStorage.setItem('carflax_print_server_url', e.target.value);
                  }}
                  placeholder="http://192.168.10.161:3002"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:border-primary/50 transition-all text-slate-700 dark:text-slate-300"
                />
              </div>

              {serverStatus === 'online' && printers.length > 0 && (
                <div className="flex flex-col gap-1 px-1 mb-1 animate-in fade-in duration-300">
                  <label className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Impressora Física</label>
                  <select
                    value={selectedPrinter}
                    onChange={(e) => {
                      setSelectedPrinter(e.target.value);
                      localStorage.setItem('carflax_selected_printer', e.target.value);
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:border-primary/50 transition-all text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {printers.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                onClick={async () => {
                  try {
                    await printRentalViaServer(selectedRentalForCoupon);
                    alert("Comprovante enviado com sucesso para a impressora pelo PrintServer!");
                  } catch (err) {
                    const errMsg = err instanceof Error ? err.message : 'Sem conexão com o PrintServer';
                    alert(`Falha ao imprimir via servidor (${errMsg}). Abrindo o visualizador de impressão do Windows...`);
                    window.print();
                  }
                }}
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Cupom
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => {
                    const durationDays = selectedRentalForCoupon.endDate 
                      ? Math.ceil((new Date(selectedRentalForCoupon.endDate).getTime() - new Date(selectedRentalForCoupon.startDate).getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    const text = `*CARFLAX HUB - COMPROVANTE DE ALUGUEL*\n` +
                      `------------------------------------------\n` +
                      `*ID do Aluguel:* ${selectedRentalForCoupon.id}\n` +
                      `*Equipamento:* ${selectedRentalForCoupon.machineName} (${selectedRentalForCoupon.machineId})\n` +
                      `*Cliente:* ${selectedRentalForCoupon.clientName}\n` +
                      `*Período:* ${new Date(selectedRentalForCoupon.startDate).toLocaleDateString('pt-BR')} até ${selectedRentalForCoupon.endDate ? new Date(selectedRentalForCoupon.endDate).toLocaleDateString('pt-BR') : 'A definir'}\n` +
                      `*Duração:* ${durationDays > 0 ? `${durationDays} ${durationDays === 1 ? 'dia' : 'dias'}` : 'Pendente'}\n` +
                      `*Vendedor:* ${selectedRentalForCoupon.salesperson}\n` +
                      `------------------------------------------\n` +
                      `*Diária:* R$ ${selectedRentalForCoupon.dailyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                      `*Total:* R$ ${selectedRentalForCoupon.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                      `*Status:* ${selectedRentalForCoupon.paymentStatus === 'paid' ? 'PAGO (Pix)' : 'PENDENTE'}\n` +
                      `------------------------------------------\n` +
                      `Obrigado pela preferência!\n` +
                      `Dúvidas: contato@carflax.com.br`;
                    navigator.clipboard.writeText(text);
                    alert("Texto do comprovante copiado para o WhatsApp!");
                  }}
                  className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Copy className="w-3 h-3" />
                  Copiar Texto
                </button>
                <button 
                  onClick={() => {
                    const durationDays = selectedRentalForCoupon.endDate 
                      ? Math.ceil((new Date(selectedRentalForCoupon.endDate).getTime() - new Date(selectedRentalForCoupon.startDate).getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    const text = `*CARFLAX HUB - COMPROVANTE DE ALUGUEL*\n` +
                      `------------------------------------------\n` +
                      `*ID do Aluguel:* ${selectedRentalForCoupon.id}\n` +
                      `*Equipamento:* ${selectedRentalForCoupon.machineName} (${selectedRentalForCoupon.machineId})\n` +
                      `*Cliente:* ${selectedRentalForCoupon.clientName}\n` +
                      `*Período:* ${new Date(selectedRentalForCoupon.startDate).toLocaleDateString('pt-BR')} até ${selectedRentalForCoupon.endDate ? new Date(selectedRentalForCoupon.endDate).toLocaleDateString('pt-BR') : 'A definir'}\n` +
                      `*Duração:* ${durationDays > 0 ? `${durationDays} ${durationDays === 1 ? 'dia' : 'dias'}` : 'Pendente'}\n` +
                      `*Vendedor:* ${selectedRentalForCoupon.salesperson}\n` +
                      `------------------------------------------\n` +
                      `*Diária:* R$ ${selectedRentalForCoupon.dailyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                      `*Total:* R$ ${selectedRentalForCoupon.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                      `*Status:* ${selectedRentalForCoupon.paymentStatus === 'paid' ? 'PAGO (Pix)' : 'PENDENTE'}\n` +
                      `------------------------------------------\n` +
                      `Obrigado pela preferência!\n` +
                      `Dúvidas: contato@carflax.com.br`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Share2 className="w-3 h-3" />
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
          
          {/* Custom style for printing */}
          <style>{`
            @media print {
              body {
                visibility: hidden !important;
                background: white !important;
              }
              #print-coupon-area, #print-coupon-area * {
                visibility: visible !important;
              }
              #print-coupon-area {
                position: absolute !important;
                left: 50% !important;
                top: 0 !important;
                transform: translateX(-50%) !important;
                width: 80mm !important;
                max-width: 80mm !important;
                margin: 0 !important;
                padding: 15px !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                color: black !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>
        </div>
      )}

      {/* Settings Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowConfigModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700">
                  <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-tight">Configurações das Termofusoras</h3>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Gerenciar preços, nomes e imagens</p>
                </div>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <Plus className="w-5 h-5 rotate-45 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1 scrollbar-hide">
              {configMachines.map((m, idx) => (
                <div key={m.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider">#{m.id}</span>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{m.name}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome</label>
                      <input 
                        type="text" 
                        value={m.name} 
                        onChange={(e) => {
                          const copy = [...configMachines];
                          copy[idx].name = e.target.value;
                          setConfigMachines(copy);
                        }}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:border-primary text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Modelo</label>
                      <input 
                        type="text" 
                        value={m.model} 
                        onChange={(e) => {
                          const copy = [...configMachines];
                          copy[idx].model = e.target.value;
                          setConfigMachines(copy);
                        }}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:border-primary text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Preço Diária (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={m.defaultPrice ?? 0} 
                        onChange={(e) => {
                          const copy = [...configMachines];
                          copy[idx].defaultPrice = parseFloat(e.target.value) || 0;
                          setConfigMachines(copy);
                        }}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:border-primary text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">URL Imagem</label>
                      <input 
                        type="text" 
                        value={m.image || ''} 
                        onChange={(e) => {
                          const copy = [...configMachines];
                          copy[idx].image = e.target.value;
                          setConfigMachines(copy);
                        }}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:border-primary text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 shrink-0 flex gap-3">
              <button 
                onClick={() => setShowConfigModal(false)}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-750 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveConfigs}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
