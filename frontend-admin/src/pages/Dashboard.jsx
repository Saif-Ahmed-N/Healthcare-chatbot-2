import { useState, useEffect } from 'react';
import { adminAPI } from '../services/adminApi';
import io from 'socket.io-client';
import { Calendar, Pill, Activity, Bell, LogOut, LayoutDashboard, Clock, Check, X, AlertCircle, RefreshCw, FileText, TestTube, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Ensure backend URL is correct
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const socket = io(API_URL);

const Dashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview'); 
  const [appointments, setAppointments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ doctors: 0, lab: 0, pharmacy: 0 });
  
  // ACTION MODAL STATE
  const [selectedAppt, setSelectedAppt] = useState(null); 
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const adminName = localStorage.getItem('admin_name') || 'Staff';
  const role = localStorage.getItem('admin_role') || 'admin';

  // --- INITIAL SETUP ---
  useEffect(() => {
    if (role === 'doctor') setActiveTab('appointments');
    else if (role === 'lab') setActiveTab('lab');
    else if (role === 'pharmacist') setActiveTab('pharmacy');

    fetchData();
    
    socket.on('new_appointment', () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log("Audio blocked"));
        } catch(e) {}
        fetchData(); 
    });
    return () => socket.off('new_appointment');
  }, [role]);

  const fetchData = async () => {
    try {
      const apptRes = await adminAPI.getAppointments();
      const rxRes = await adminAPI.getPharmacyOrders();
      
      // Safety check: ensure data is an array
      const apptData = Array.isArray(apptRes.data) ? apptRes.data : [];
      const rxData = Array.isArray(rxRes.data) ? rxRes.data : [];

      setAppointments(apptData);
      setOrders(rxData);
      
      setStats({
          doctors: apptData.filter(a => a.type !== 'lab_test' && a.status === 'pending').length,
          lab: apptData.filter(a => a.type === 'lab_test' && a.status !== 'completed').length,
          pharmacy: rxData.filter(o => o.status === 'preparing').length
      });
    } catch (e) { 
        console.error("Data Load Error", e); 
    }
  };

  const handleStatus = async (type, id, status) => {
    try {
        if (status === 'rescheduled') {
            if (!rescheduleDate || !rescheduleTime) {
                alert("Please select a valid date and time first.");
                return;
            }
            await adminAPI.updateStatus(type, id, status, { date: rescheduleDate, time: rescheduleTime });
        } else {
            await adminAPI.updateStatus(type, id, status);
        }
        
        setSelectedAppt(null); // Close modal
        setRescheduleDate(''); // Reset fields
        setRescheduleTime('');
        fetchData(); // Refresh table
    } catch (e) {
        alert("Action Failed. Check console.");
        console.error(e);
    }
  };

  // --- SUB-COMPONENTS ---
  const SidebarItem = ({ id, icon: Icon, label, count, visible }) => {
      if (!visible) return null;
      return (
        <button 
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center justify-between p-3 rounded-xl mb-1 transition-all ${activeTab === id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
        >
            <div className="flex items-center gap-3">
                <Icon size={20} />
                <span className="font-medium text-sm">{label}</span>
            </div>
            {count > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{count}</span>}
        </button>
      );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-900 text-white p-6 flex flex-col justify-between">
        <div>
            <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">M</div>
                <h1 className="font-bold text-lg tracking-tight">MediCare<span className="text-blue-400">Admin</span></h1>
            </div>

            <div className="space-y-1">
                <p className="px-3 text-xs font-bold text-slate-500 uppercase mb-2 mt-4">Workspace</p>
                
                {/* STRICT ROLE FILTERING */}
                <SidebarItem id="appointments" icon={Calendar} label="Appointments" count={stats.doctors} visible={role === 'doctor' || role === 'admin'} />
                <SidebarItem id="lab" icon={Activity} label="Lab Queue" count={stats.lab} visible={role === 'lab' || role === 'admin'} />
                <SidebarItem id="pharmacy" icon={Pill} label="Pharmacy" count={stats.pharmacy} visible={role === 'pharmacist' || role === 'admin'} />
            </div>
        </div>

        <button onClick={onLogout} className="flex items-center gap-3 text-slate-400 hover:text-white px-3 py-2 transition-colors">
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP BAR */}
        <div className="h-16 bg-white border-b border-slate-100 flex justify-between items-center px-8">
            <h2 className="font-bold text-slate-800 text-lg capitalize flex items-center gap-2">
                {activeTab === 'appointments' && <><Calendar className="text-blue-500"/> My Schedule</>}
                {activeTab === 'lab' && <><Activity className="text-purple-500"/> Lab Requests</>}
                {activeTab === 'pharmacy' && <><Pill className="text-emerald-500"/> Pharmacy Orders</>}
                {activeTab === 'overview' && <><LayoutDashboard className="text-slate-500"/> Overview</>}
            </h2>
            <div className="flex items-center gap-6">
                <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{adminName}</p>
                    <p className="text-xs text-slate-400 font-medium capitalize border border-slate-200 px-2 py-0.5 rounded-full bg-slate-50 inline-block">{role === 'lab' ? 'Technician' : role}</p>
                </div>
            </div>
        </div>

        {/* DASHBOARD CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 relative">
            
            {/* DOCTOR VIEW: APPOINTMENTS */}
            {activeTab === 'appointments' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Patient</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date & Time</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {appointments.filter(a => a.type !== 'lab_test').map(appt => (
                                <tr key={appt.id} className="hover:bg-slate-50/50">
                                    <td className="p-4 font-bold text-slate-700">Patient #{appt.patient_id}</td>
                                    <td className="p-4 text-sm text-slate-600">
                                        {new Date(appt.appointment_time).toLocaleDateString()}
                                        <span className="ml-2 text-slate-400">{new Date(appt.appointment_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                    </td>
                                    <td className="p-4"><span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">Video Consult</span></td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                            appt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                                            appt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                                            appt.status === 'rescheduled' ? 'bg-blue-100 text-blue-700' : 
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>{appt.status}</span>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => setSelectedAppt(appt)} className="text-xs font-bold bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors">Manage</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {appointments.filter(a => a.type !== 'lab_test').length === 0 && <div className="text-center text-slate-400 mt-10">No appointments found.</div>}
                </div>
            )}

            {/* LAB VIEW: TEST REQUESTS */}
            {activeTab === 'lab' && (
                <div className="grid grid-cols-1 gap-4">
                    {appointments.filter(a => a.type === 'lab_test').map(test => {
                        const isHome = test.doctor_name && test.doctor_name.includes("Home Collection");
                        return (
                            <div key={test.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-purple-300 transition-all">
                                <div className="flex gap-4 items-center">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isHome ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                                        {isHome ? <Truck size={24}/> : <TestTube size={24}/>}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">Test #{test.id}</h3>
                                        <p className="text-sm text-slate-600 font-medium">{test.doctor_name || "Lab Test"}</p>
                                        <p className="text-xs text-slate-400 mt-1">Patient #{test.patient_id} • Status: <span className="uppercase font-bold text-slate-600">{test.status}</span></p>
                                    </div>
                                </div>
                                <div>
                                    <button onClick={() => setSelectedAppt(test)} className="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-purple-600 shadow-lg shadow-slate-200 transition-all">Manage Request</button>
                                </div>
                            </div>
                        );
                    })}
                    {appointments.filter(a => a.type === 'lab_test').length === 0 && <div className="text-center text-slate-400 mt-10">No pending lab tests.</div>}
                </div>
            )}

            {/* PHARMACY VIEW */}
            {activeTab === 'pharmacy' && (
                <div className="grid grid-cols-2 gap-6">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                             <div className="flex justify-between mb-4">
                                <h3 className="font-bold text-slate-800">Rx Order #{order.id}</h3>
                                <span className="text-xs font-bold uppercase bg-slate-100 px-2 py-1 rounded text-slate-500">{order.status}</span>
                             </div>
                             <div className="h-24 bg-slate-50 rounded-lg p-3 mb-4 text-xs font-mono text-slate-600 overflow-y-auto border border-slate-100">
                                {order.extracted_data || "Reading prescription..."}
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => handleStatus('prescription', order.id, 'ready')} className="flex-1 bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold hover:bg-emerald-600">Mark Ready</button>
                                <button onClick={() => handleStatus('prescription', order.id, 'delivered')} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-600">Dispatched</button>
                             </div>
                        </div>
                    ))}
                    {orders.length === 0 && <div className="col-span-2 text-center text-slate-400 mt-10">No orders in queue.</div>}
                </div>
            )}
            
        </div>
      </div>

      {/* ROBUST MANAGEMENT MODAL */}
      <AnimatePresence>
        {selectedAppt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-900/5">
                    
                    {/* MODAL HEADER */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">{selectedAppt.type === 'lab_test' ? 'Manage Lab Request' : 'Manage Appointment'}</h3>
                            <p className="text-xs text-slate-500">ID #{selectedAppt.id} • Patient #{selectedAppt.patient_id}</p>
                        </div>
                        <button onClick={() => setSelectedAppt(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
                    </div>

                    {/* MODAL BODY */}
                    <div className="p-6 space-y-4">
                        
                        {/* LAB ACTIONS */}
                        {selectedAppt.type === 'lab_test' ? (
                            <>
                                <button onClick={() => handleStatus('appointment', selectedAppt.id, 'processing')} className="w-full flex items-center justify-between p-4 bg-yellow-50 text-yellow-700 rounded-xl font-bold hover:bg-yellow-100 border border-yellow-200 transition-colors">
                                    <div>
                                        <span className="block">Sample Collected</span>
                                        <span className="text-[10px] opacity-70 font-normal">Mark as Processing</span>
                                    </div>
                                    <TestTube size={18}/>
                                </button>

                                <button onClick={() => handleStatus('appointment', selectedAppt.id, 'completed')} className="w-full flex items-center justify-between p-4 bg-green-50 text-green-700 rounded-xl font-bold hover:bg-green-100 border border-green-200 transition-colors">
                                    <div>
                                        <span className="block">Result Ready</span>
                                        <span className="text-[10px] opacity-70 font-normal">Upload Report & Notify</span>
                                    </div>
                                    <FileText size={18}/>
                                </button>
                            </>
                        ) : (
                            /* DOCTOR ACTIONS */
                            <button onClick={() => handleStatus('appointment', selectedAppt.id, 'confirmed')} className="w-full flex items-center justify-between p-4 bg-green-50 text-green-700 rounded-xl font-bold hover:bg-green-100 border border-green-200 transition-colors">
                                Confirm Booking <Check size={18}/>
                            </button>
                        )}
                        
                        {/* RESCHEDULE ACTION */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wide">Reschedule To</p>
                            <div className="flex gap-2 mb-3">
                                <input type="date" className="flex-1 p-2 border rounded-lg text-sm outline-none focus:border-blue-500" onChange={e => setRescheduleDate(e.target.value)} />
                                <input type="time" className="flex-1 p-2 border rounded-lg text-sm outline-none focus:border-blue-500" onChange={e => setRescheduleTime(e.target.value)} />
                            </div>
                            <button onClick={() => handleStatus('appointment', selectedAppt.id, 'rescheduled')} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-blue-700 flex justify-center items-center gap-2 transition-colors">
                                <RefreshCw size={14}/> Save New Time
                            </button>
                        </div>

                        <button onClick={() => handleStatus('appointment', selectedAppt.id, 'cancelled')} className="w-full flex items-center justify-center gap-2 p-3 text-red-600 text-sm font-bold hover:bg-red-50 rounded-xl transition-colors">
                            <AlertCircle size={16}/> Cancel Request
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Dashboard;