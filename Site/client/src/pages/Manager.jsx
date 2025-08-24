import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const sidebarItems = [
  "Dashboard",
  "Trips",
  "Manage Data",
  "Message support",
  "Users",
  "Login Logs", 
];

const styles = {
  box: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "28px",
    maxWidth: "1000px",
    width: "100%",
    backgroundColor: "#fff",
    boxShadow: "0 6px 22px rgba(0,0,0,0.08)",
    marginTop: "16px",
  },
  messageBodyBox: {
    marginTop: 12,
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '14px',
    maxHeight: '40vh',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6,
    fontSize: 14,
    color: '#374151'
  },
  messageLabel: {
    marginTop: 16,
    fontWeight: 700,
    fontSize: 14,
    color: '#1f2937'
  },
  header: { marginBottom: "20px", display: "flex", gap: "16px", alignItems: "center" },
  label: { fontWeight: 700, minWidth: 160, fontSize: 16 },
  select: { padding: "14px", borderRadius: "12px", border: "1px solid #d1d5db", width: "100%", fontSize: 16 },
  form: {
    marginBottom: "20px",
    display: "grid",
    gap: "14px",
    gridTemplateColumns: "1fr 1fr 1fr",
  },
  input: {
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    width: "100%",
    fontSize: 16,
  },
  textarea: {
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    minHeight: 120,
    gridColumn: "1 / -1",
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: "#3b82f6",
    color: "#fff",
    padding: "14px 22px",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    width: "220px",
    fontWeight: 800,
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: "#10b981",
    color: "#fff",
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    marginTop: "10px",
  },
  removeBtn: {
    backgroundColor: "#ef4444",
    color: "#fff",
    padding: "8px 12px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
    marginLeft: "10px",
  },
  gridWrap: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    maxWidth: 800,
    marginTop: 16,
  },
  card: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    padding: "18px 20px",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#fff",
    boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
    cursor: "pointer",
    transition: "transform .06s ease, box-shadow .12s ease",
  },
  cardHover: { transform: "translateY(-2px)", boxShadow: "0 10px 22px rgba(0,0,0,0.10)" },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 18,
    color: "#fff",
  },
  cardBody: { display: "flex", flexDirection: "column" },
  cardTitle: { fontWeight: 800, lineHeight: 1.2, fontSize: 16 },
  cardDesc: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  stepHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  backBtn: {
    border: "1px solid #d1d5db",
    background: "#fff",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  },
  successChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#ecfdf5",
    color: "#065f46",
    border: "1px solid #a7f3d0",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 14,
  },
  hotelItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    marginBottom: "10px",
  },
  attractionItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    marginBottom: "10px",
  },
  messagesContainer: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  messagesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  messagesTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },
  filterContainer: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  filterSelect: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#fff',
    fontSize: '14px',
    cursor: 'pointer'
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '10px 0 5px 0'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },
  messagesGrid: {
    display: 'grid',
    gap: '16px'
  },
  messageCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },
  messageCardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 16px rgba(0,0,0,0.12)'
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  messageInfo: {
    flex: 1
  },
  messageName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 5px 0'
  },
  messageEmail: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 5px 0'
  },
  messageDate: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fcd34d'
  },
  statusResolved: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    border: '1px solid #6ee7b7'
  },
  statusClosed: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5'
  },
  messageContent: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.6',
    marginBottom: '15px'
  },
  messageActions: {
    display: 'flex',
    gap: '10px'
  },
  actionButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  resolveButton: {
    backgroundColor: '#10b981',
    color: '#fff'
  },
  closeButton: {
    backgroundColor: '#ef4444',
    color: '#fff'
  },
  reopenButton: {
    backgroundColor: '#f59e0b',
    color: '#fff'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0
  },
  closeModalButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#6b7280'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  usersContainer: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  searchContainer: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  searchInput: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px'
  },
  searchButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  },
  clearButton: {
    padding: '12px 20px',
    backgroundColor: '#6b7280',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  },
  usersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  userCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },
  userCardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 16px rgba(0,0,0,0.12)'
  },
  userAvatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '16px',
    border: '3px solid #e5e7eb'
  },
  userInfo: {
    textAlign: 'center'
  },
  userName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 8px 0'
  },
  userEmail: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 16px 0'
  },
  adminBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fcd34d',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: '16px'
  },
  deleteUserButton: {
    width: '100%',
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    marginTop: '12px'
  },
  usersStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  // Login Logs styles
  loginLogsContainer: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  logTable: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden'
  },
  logTableHeader: {
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e5e7eb'
  },
  logTableRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s ease'
  },
  logTableRowHover: {
    backgroundColor: '#f8fafc'
  },
  logTableCell: {
    padding: '16px',
    fontSize: '14px',
    verticalAlign: 'top'
  },
  logTableHeaderCell: {
    padding: '16px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    backgroundColor: '#f8f9fa'
  },
  logUserInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logUserAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #e5e7eb'
  },
  logUserDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  logUserName: {
    fontWeight: 'bold',
    color: '#1f2937',
    fontSize: '14px',
    margin: 0
  },
  logUserEmail: {
    color: '#6b7280',
    fontSize: '12px',
    margin: 0
  },
  logIpInfo: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#4b5563'
  },
  logDeviceInfo: {
    fontSize: '12px',
    color: '#6b7280',
    maxWidth: '200px',
    wordBreak: 'break-word',
    lineHeight: '1.4'
  },
  refreshButton: {
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  },
  dateRangeContainer: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  dateInput: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px'
  }
};

const Manager = () => {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [statusMessage, setStatusMessage] = useState(null);
  
  const [dashboardData, setDashboardData] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    topDestinations: [],
    revenueByDate: [],
  });

  // States for Messages Management
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState(null);

  // States for Users Management
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // States for Login Logs
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginLogsLoading, setLoginLogsLoading] = useState(false);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });

  // Email reply popup state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('Re: Your PathMakers support ticket');
  const [emailBody, setEmailBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    if (activeItem === "Dashboard") {
      fetch("http://localhost:4000/api/manager/dashboard")
        .then((res) => res.json())
        .then((data) => {
          console.log("📊 Dashboard API data:", data);
          setDashboardData({
            totalOrders: data.totalOrders || 0,
            totalRevenue: data.totalRevenue || 0,
            topDestinations: data.topDestinations || [],
            ordersByDate: data.ordersByDate || [],
            revenueByDate: data.revenueByDate || [],
            revenueByMonth: data.revenueByMonth || [],
          });
        })
        .catch((err) => console.error("Error loading dashboard data:", err));
    }

    if (activeItem === "Message support") {
      fetchMessages();
    }

    if (activeItem === "Users") {
      fetchUsers();
    }

    if (activeItem === "Login Logs") {
      fetchLoginLogs();
    }
  }, [activeItem]);

  // Login Logs Functions
  const fetchLoginLogs = async () => {
    try {
      setLoginLogsLoading(true);
      const response = await fetch('http://localhost:4000/api/manager/login-logs');
      if (response.ok) {
        const data = await response.json();
        setLoginLogs(data);
        setFilteredLogs(data);
      } else {
        console.error('Failed to fetch login logs');
      }
    } catch (error) {
      console.error('Error fetching login logs:', error);
    } finally {
      setLoginLogsLoading(false);
    }
  };

  const searchLogs = () => {
    let filtered = loginLogs;

    // Filter by search term (username or email)
    if (logSearchTerm.trim()) {
      filtered = filtered.filter(log => 
        log.user?.username?.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        log.user?.email?.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        log.ip?.includes(logSearchTerm.toLowerCase())
      );
    }

    // Filter by date range
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      filtered = filtered.filter(log => new Date(log.timestamp) >= fromDate);
    }
    
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(log => new Date(log.timestamp) <= toDate);
    }

    setFilteredLogs(filtered);
  };

  const clearLogSearch = () => {
    setLogSearchTerm('');
    setDateRange({ from: '', to: '' });
    setFilteredLogs(loginLogs);
  };

  const getDeviceType = (userAgent) => {
    if (!userAgent) return 'Unknown';
    
    if (userAgent.includes('Expo')) return 'Mobile App (Expo)';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS Device';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    
    return 'Unknown Device';
  };

  // Users Management Functions
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch('http://localhost:4000/api/auth/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const searchUsers = () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setFilteredUsers(users);
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/auth/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
        setFilteredUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
        setSelectedUser(null);
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  const openEmailModal = (msg) => {
    setEmailSubject(`Re: ${msg?.subject || 'Your PathMakers support request'}`);
    setEmailBody(`Hi ${msg?.name || ''},

Thanks for reaching out!`);
    setEmailModalOpen(true);
  };

  const sendSupportEmail = async (message) => {
    try {
      setSendingReply(true);
      const res = await fetch(`http://localhost:4000/api/support/${message._id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject.trim(),
          text: emailBody.trim(),
          html: `<p style="white-space:pre-line">${emailBody.trim()}</p>`,
          markResolved: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to send');

      setEmailModalOpen(false);
      setEmailBody('');
      setStatusMessage({ text: '✅ Email sent successfully', type: 'success' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setStatusMessage({ text: `❌ ${e.message}`, type: 'error' });
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setSendingReply(false);
    }
  };

  // Messages Management Functions
  const fetchMessages = async () => {
    try {
      setMessagesLoading(true);
      const response = await fetch('http://localhost:4000/api/support');
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        console.error('Failed to fetch messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const updateMessageStatus = async (messageId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:4000/api/support/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg._id === messageId ? { ...msg, status: newStatus } : msg
          )
        );
        setSelectedMessage(null);
      } else {
        alert('Failed to update message status');
      }
    } catch (error) {
      console.error('Error updating message status:', error);
      alert('Error updating message status');
    }
  };

  const filteredMessages = messages.filter(message => {
    if (filter === 'all') return true;
    return message.status === filter;
  });

  const messageStats = {
    total: messages.length,
    pending: messages.filter(m => m.status === 'pending').length,
    resolved: messages.filter(m => m.status === 'resolved').length,
    closed: messages.filter(m => m.status === 'closed').length
  };

  const userStats = {
    total: users.length,
    admins: users.filter(u => u.username === "managerMay" || u.email === "managerMay").length,
    regular: users.filter(u => u.username !== "managerMay" && u.email !== "managerMay").length
  };

  const loginLogStats = {
    total: loginLogs.length,
    today: loginLogs.filter(log => {
      const today = new Date();
      const logDate = new Date(log.timestamp);
      return logDate.toDateString() === today.toDateString();
    }).length,
    thisWeek: loginLogs.filter(log => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(log.timestamp) >= oneWeekAgo;
    }).length,
    uniqueUsers: new Set(loginLogs.map(log => log.userId)).size
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending':
        return { ...styles.statusBadge, ...styles.statusPending };
      case 'resolved':
        return { ...styles.statusBadge, ...styles.statusResolved };
      case 'closed':
        return { ...styles.statusBadge, ...styles.statusClosed };
      default:
        return styles.statusBadge;
    }
  };

  const renderActionButtons = (message) => {
    const buttons = [];

    if (message.status === 'pending') {
      buttons.push(
        <button
          key="resolve"
          style={{ ...styles.actionButton, ...styles.resolveButton }}
          onClick={(e) => {
            e.stopPropagation();
            updateMessageStatus(message._id, 'resolved');
          }}
        >
          Mark Resolved
        </button>
      );
      buttons.push(
        <button
          key="close"
          style={{ ...styles.actionButton, ...styles.closeButton }}
          onClick={(e) => {
            e.stopPropagation();
            updateMessageStatus(message._id, 'closed');
          }}
        >
          Close
        </button>
      );
    } else if (message.status === 'resolved') {
      buttons.push(
        <button
          key="close"
          style={{ ...styles.actionButton, ...styles.closeButton }}
          onClick={(e) => {
            e.stopPropagation();
            updateMessageStatus(message._id, 'closed');
          }}
        >
          Close
        </button>
      );
      buttons.push(
        <button
          key="reopen"
          style={{ ...styles.actionButton, ...styles.reopenButton }}
          onClick={(e) => {
            e.stopPropagation();
            updateMessageStatus(message._id, 'pending');
          }}
        >
          Reopen
        </button>
      );
    } else if (message.status === 'closed') {
      buttons.push(
        <button
          key="reopen"
          style={{ ...styles.actionButton, ...styles.reopenButton }}
          onClick={(e) => {
            e.stopPropagation();
            updateMessageStatus(message._id, 'pending');
          }}
        >
          Reopen
        </button>
      );
    }

    return buttons;
  };

  // ManageDataUpdateBox Component
  function ManageDataUpdateBox() {
    const [step, setStep] = useState("choose");
    const [collection, setCollection] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [formData, setFormData] = useState({
      cityName: "",
      city: "",
      hotels: [{ name: "", price: "" }],
      attractions: [{ name: "", openingHours: "", price: "" }],
      flightName: "", 
      flightPrice: "", 
      flightDuration: "",
    });

    const pick = (key) => {
      setCollection(key);
      setSaved(false);
      setStep("form");
    };

    const handleChange = (e) => {
      const { name, value } = e.target;
      console.log("handleChange:", name, value);
      setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleHotelChange = (index, field, value) => {
      const newHotels = [...formData.hotels];
      newHotels[index][field] = value;
      setFormData(prev => ({ ...prev, hotels: newHotels }));
    };

    const addHotel = () => {
      setFormData(prev => ({
        ...prev,
        hotels: [...prev.hotels, { name: "", price: "" }]
      }));
    };

    const removeHotel = (index) => {
      if (formData.hotels.length > 1) {
        const newHotels = formData.hotels.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, hotels: newHotels }));
      }
    };

    const handleAttractionChange = (index, field, value) => {
      const newAttractions = [...formData.attractions];
      newAttractions[index][field] = value;
      setFormData(prev => ({ ...prev, attractions: newAttractions }));
    };

    const addAttraction = () => {
      setFormData(prev => ({
        ...prev,
        attractions: [...prev.attractions, { name: "", openingHours: "", price: "" }]
      }));
    };

    const removeAttraction = (index) => {
      if (formData.attractions.length > 1) {
        const newAttractions = formData.attractions.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, attractions: newAttractions }));
      }
    };

    const handleBack = () => {
      setFormData({
        cityName: "",
        city: "",
        hotels: [{ name: "", price: "" }],
        attractions: [{ name: "", openingHours: "", price: "" }],
        flightName: "", 
        flightPrice: "", 
        flightDuration: "",
      });
      setCollection(null);
      setStep("choose");
    };

    const handleSave = async () => {
      try {
        setSaving(true);
        let url = "";
        let payload = {};

        switch (collection) {
          case "cities":
            if (!formData.cityName) throw new Error("City name is required");
            url = "http://localhost:4000/api/travel/cities"; 
            payload = { city: formData.cityName.trim() };
            break;

          case "hotels":
            if (!formData.city) throw new Error("City is required");
            
            const validHotels = formData.hotels.filter(h => h.name.trim() && h.price);
            if (validHotels.length === 0) {
              throw new Error("At least one hotel with name and price is required");
            }

            url = "http://localhost:4000/api/manager/collections/hotels/upsertItems";
            payload = {
              city: formData.city.trim(),
              hotels: validHotels.map(h => ({
                name: h.name.trim(),
                price: parseFloat(h.price)
              }))
            };
            break;

         case "attractions":
          if (!formData.city) throw new Error("City is required");

          const validAttractions = formData.attractions.filter(
            a => a.name?.trim() && a.openingHours?.trim() && a.price != null
          );

          if (validAttractions.length === 0) {
            throw new Error("At least one attraction with all details is required");
          }

          url = "http://localhost:4000/api/manager/collections/attractions/upsertItems";
          payload = {
            city: formData.city.trim(),
            attractions: validAttractions.map(a => ({
              name: a.name.trim(),
              openingHours: a.openingHours.trim(),
              price: parseFloat(a.price)
            }))
          };
          break;

        case "flights":
          if (!formData.city) throw new Error("City is required");

          const flightsArray = formData.flights || [];
          const validFlights = flightsArray.filter(
            f => f.name?.trim() && f.price != null && f.duration?.trim()
          );

          if (validFlights.length === 0) {
            throw new Error("At least one flight with all details is required");
          }

          url = "http://localhost:4000/api/manager/collections/flights/upsertItems";
          payload = {
            city: formData.city.trim(),
            flights: validFlights.map(f => ({
              name: f.name.trim(),
              price: parseFloat(f.price),
              duration: f.duration.trim()
            }))
          };
          break;

          default:
            throw new Error("Pick a collection to update");
        }

        console.log("Sending payload:", payload);
        
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to save");
        }

        setSaved(true);
        setSaving(false);
        setTimeout(() => {
          setSaved(false);
          handleBack();
        }, 1400);
      } catch (err) {
        console.error("Save error:", err);
        alert(`Error: ${err.message}`);
        setSaving(false);
      }
    };

    if (step === "choose") {
      return (
        <div style={styles.box}>
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>What would you like to update?</h3>
            {saved && <div style={styles.successChip}>✓ Saved</div>}
          </div>

          <div style={styles.gridWrap}>
            <div
              style={styles.card}
              onClick={() => pick("cities")}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = styles.card.boxShadow;
              }}
            >
              <div style={{ ...styles.cardIcon, background: "linear-gradient(135deg,#60a5fa,#2563eb)" }}>C</div>
              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>Cities</div>
                <div style={styles.cardDesc}>Add a new city</div>
              </div>
            </div>

            <div
              style={styles.card}
              onClick={() => pick("hotels")}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = styles.card.boxShadow;
              }}
            >
              <div style={{ ...styles.cardIcon, background: "linear-gradient(135deg,#34d399,#059669)" }}>H</div>
              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>Hotels</div>
                <div style={styles.cardDesc}>Add multiple hotels to a city</div>
              </div>
            </div>

            <div
              style={styles.card}
              onClick={() => pick("attractions")}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = styles.card.boxShadow;
              }}
            >
              <div style={{ ...styles.cardIcon, background: "linear-gradient(135deg,#f472b6,#db2777)" }}>A</div>
              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>Attractions</div>
                <div style={styles.cardDesc}>Add multiple attractions to a city</div>
              </div>
            </div>

            <div
              style={styles.card}
              onClick={() => pick("flights")}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = styles.card.boxShadow;
              }}
            >
              <div style={{ ...styles.cardIcon, background: "linear-gradient(135deg,#a78bfa,#7c3aed)" }}>F</div>
              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>Flights</div>
                <div style={styles.cardDesc}>Add a flight (name, city, price, duration)</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.box}>
        <div style={styles.stepHeader}>
          <button style={styles.backBtn} onClick={handleBack}>← Back</button>
          {saved && <div style={styles.successChip}>✓ Saved</div>}
        </div>

        <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 18 }}>
          Update: {collection?.[0].toUpperCase() + collection?.slice(1)}
        </div>

        {collection === "cities" && (
          <div style={styles.form}>
            <input 
              name="cityName" 
              placeholder="City name" 
              style={styles.input}
              value={formData.cityName} 
              onChange={handleChange} 
            />        
          </div>
        )}

        {collection === "hotels" && (
          <div>
            <div style={styles.form}>
              <input 
                name="city" 
                placeholder="City name" 
                style={{ ...styles.input, gridColumn: "1 / -1" }}
                value={formData.city} 
                onChange={handleChange} 
              />
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>Hotels:</h4>
              {formData.hotels.map((hotel, index) => (
                <div key={index} style={styles.hotelItem}>
                  <input
                    placeholder="Hotel name"
                    value={hotel.name}
                    onChange={(e) => handleHotelChange(index, 'name', e.target.value)}
                    style={{ ...styles.input, flex: 1, margin: 0 }}
                  />
                  <input
                    placeholder="Price"
                    type="number"
                    value={hotel.price}
                    onChange={(e) => handleHotelChange(index, 'price', e.target.value)}
                    style={{ ...styles.input, flex: 1, margin: 0 }}
                  />
                  {formData.hotels.length > 1 && (
                    <button
                      onClick={() => removeHotel(index)}
                      style={styles.removeBtn}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addHotel} style={styles.addBtn}>
                + Add Another Hotel
              </button>
            </div>
          </div>
        )}

        {collection === "attractions" && (
          <div>
            <div style={styles.form}>
              <input 
                name="city" 
                placeholder="City name" 
                style={{ ...styles.input, gridColumn: "1 / -1" }}
                value={formData.city} 
                onChange={handleChange} 
              />
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>Attractions:</h4>
              {formData.attractions.map((attraction, index) => (
                <div key={index} style={styles.attractionItem}>
                  <input
                    placeholder="Attraction name"
                    value={attraction.name}
                    onChange={(e) => handleAttractionChange(index, 'name', e.target.value)}
                    style={{ ...styles.input, flex: 1, margin: 0 }}
                  />
                  <input
                    placeholder="Opening hours (e.g. 09:00-17:00)"
                    value={attraction.openingHours}
                    onChange={(e) => handleAttractionChange(index, 'openingHours', e.target.value)}
                    style={{ ...styles.input, flex: 1, margin: 0 }}
                  />
                  <input
                    placeholder="Price"
                    type="number"
                    value={attraction.price}
                    onChange={(e) => handleAttractionChange(index, 'price', e.target.value)}
                    style={{ ...styles.input, flex: 1, margin: 0 }}
                  />
                  {formData.attractions.length > 1 && (
                    <button
                      onClick={() => removeAttraction(index)}
                      style={styles.removeBtn}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addAttraction} style={styles.addBtn}>
                + Add Another Attraction
              </button>
            </div>
          </div>
        )}

        {collection === "flights" && (
          <div style={styles.form}>
            <input 
              name="city" 
              placeholder="City" 
              style={styles.input}
              value={formData.city} 
              onChange={handleChange} 
            />

            {formData.flights?.map((flight, index) => (
              <div key={index} style={{ marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Airline / Flight"
                  style={styles.input}
                  value={flight.name}
                  onChange={e => {
                    const updatedFlights = [...formData.flights];
                    updatedFlights[index].name = e.target.value;
                    setFormData(prev => ({ ...prev, flights: updatedFlights }));
                  }}
                />
                <input
                  type="number"
                  placeholder="Price"
                  style={styles.input}
                  value={flight.price}
                  onChange={e => {
                    const updatedFlights = [...formData.flights];
                    updatedFlights[index].price = e.target.value;
                    setFormData(prev => ({ ...prev, flights: updatedFlights }));
                  }}
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 8h 00m)"
                  style={styles.input}
                  value={flight.duration}
                  onChange={e => {
                    const updatedFlights = [...formData.flights];
                    updatedFlights[index].duration = e.target.value;
                    setFormData(prev => ({ ...prev, flights: updatedFlights }));
                  }}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  flights: [...(prev.flights || []), { name: "", price: "", duration: "" }]
                }));
              }}
              style={{ marginTop: 10 }}
            >
              Add Another Flight
            </button>
          </div>
        )}

        <button onClick={handleSave} style={styles.saveBtn} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    );
  }

  // Main render function
  const renderContent = () => {
    if (activeItem === "Login Logs") {
      if (loginLogsLoading) {
        return <div style={styles.loading}>Loading login logs...</div>;
      }

      return (
        <div style={styles.loginLogsContainer}>
          {/* Header */}
          <div style={styles.messagesHeader}>
            <h1 style={styles.messagesTitle}>Login Activity Logs</h1>
            <button style={styles.refreshButton} onClick={fetchLoginLogs}>
              🔄 Refresh
            </button>
          </div>

          {/* Search and Filters */}
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search by username, email, or IP address..."
              value={logSearchTerm}
              onChange={(e) => setLogSearchTerm(e.target.value)}
              style={styles.searchInput}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  searchLogs();
                }
              }}
            />
            
            <div style={styles.dateRangeContainer}>
              <label style={{ fontSize: '14px', color: '#6b7280' }}>From:</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                style={styles.dateInput}
              />
              
              <label style={{ fontSize: '14px', color: '#6b7280' }}>To:</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                style={styles.dateInput}
              />
            </div>
            
            <button style={styles.searchButton} onClick={searchLogs}>
              Filter
            </button>
            <button style={styles.clearButton} onClick={clearLogSearch}>
              Clear
            </button>
          </div>

          {/* Statistics */}
          <div style={styles.statsContainer}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{loginLogStats.total}</div>
              <div style={styles.statLabel}>Total Logins</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#f59e0b' }}>{loginLogStats.uniqueUsers}</div>
              <div style={styles.statLabel}>Unique Users</div>
            </div>
          </div>

          {/* Logs Table */}
          {filteredLogs.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔐</div>
              <div style={styles.emptyTitle}>No login logs found</div>
              <div>No login activity matches the current filter criteria.</div>
            </div>
          ) : (
            <div style={styles.logTable}>
              <div style={styles.logTableHeader}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '16px' }}>
                  <div style={styles.logTableHeaderCell}>User</div>
                  <div style={styles.logTableHeaderCell}>Login Time</div>
                  <div style={styles.logTableHeaderCell}>IP Address</div>
                  <div style={styles.logTableHeaderCell}>Device/Browser</div>
                  <div style={styles.logTableHeaderCell}>Location</div>
                </div>
              </div>
              
              <div style={{ maxHeight: '600px', overflow: 'auto' }}>
                {filteredLogs.map((log, index) => (
                  <div
                    key={log._id || index}
                    style={styles.logTableRow}
                    onMouseEnter={(e) => {
                      Object.assign(e.currentTarget.style, styles.logTableRowHover);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '';
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '16px' }}>
                      {/* User Info */}
                      <div style={styles.logTableCell}>
                        <div style={styles.logUserInfo}>
                          <img
                            src={log.user?.profile_image || 'https://res.cloudinary.com/dnnmhrsja/image/upload/v1741780893/user_profiles/may.jpg'}
                            alt="User avatar"
                            style={styles.logUserAvatar}
                            onError={(e) => {
                              e.target.src = 'https://res.cloudinary.com/dnnmhrsja/image/upload/v1741780893/user_profiles/may.jpg';
                            }}
                          />
                          <div style={styles.logUserDetails}>
                            <div style={styles.logUserName}>
                              {log.user?.username || 'Unknown User'}
                            </div>
                      
                          </div>
                        </div>
                      </div>

                      {/* Login Time */}
                      <div style={styles.logTableCell}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                          {formatDateShort(log.timestamp)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {new Date(log.timestamp).toLocaleTimeString('he-IL')}
                        </div>
                      </div>

                      {/* IP Address */}
                      <div style={styles.logTableCell}>
                        <div style={styles.logIpInfo}>
                          {log.ip ? log.ip.split(',')[0].trim() : 'Unknown IP'}
                        </div>
                        {log.ip && log.ip.includes(',') && (
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                            {log.ip.split(',').length - 1} proxy(s)
                          </div>
                        )}
                      </div>

                      {/* Device/Browser */}
                      <div style={styles.logTableCell}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
                          {getDeviceType(log.userAgent)}
                        </div>
                        <div style={styles.logDeviceInfo}>
                          {log.userAgent ? log.userAgent.substring(0, 50) + (log.userAgent.length > 50 ? '...' : '') : 'Unknown'}
                        </div>
                      </div>

                      {/* Location (placeholder) */}
                      <div style={styles.logTableCell}>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {log.ip ? (log.ip.includes('85.64') ? '🇮🇱 Israel' : '🌍 Unknown') : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeItem === "Manage Data") {
      return (
        <>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937' }}>Manage Travel Data</h1>
          <ManageDataUpdateBox />
        </>
      );
    }

    if (activeItem === "Dashboard") {
      return (
        <>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937' }}>Dashboard</h1>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>Trips this month</p>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' }}>{dashboardData.totalOrders}</p>
              <p style={{ fontSize: '14px', color: '#10b981', margin: 0 }}>+10%</p>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>Revenue this month</p>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' }}>${(dashboardData.totalRevenue || 0).toFixed(2)}</p>
              <p style={{ fontSize: '14px', color: '#10b981', margin: 0 }}>+15%</p>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>Average trip rating</p>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' }}>4.8</p>
              <p style={{ fontSize: '14px', color: '#10b981', margin: 0 }}>+5%</p>
            </div>
          </section>
          
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>Trips by destination</p>
              {dashboardData.topDestinations?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dashboardData.topDestinations}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="trips" fill="#47569e" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p>No trip destinations data available.</p>
              )}
            </div>

            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>Revenue over time</p>
              {dashboardData.revenueByMonth?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dashboardData.revenueByMonth.map(item => ({
                    date: item.monthLabel || item.month,
                    revenue: item.revenue
                  }))}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toFixed(2)}`} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#47569e"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>No revenue data available.</p>
              )}
            </div>
          </section>
        </>
      );
    }

    if (activeItem === "Users") {
      if (usersLoading) {
        return <div style={styles.loading}>Loading users...</div>;
      }

      return (
        <div style={styles.usersContainer}>
          {/* Header */}
          <div style={styles.messagesHeader}>
            <h1 style={styles.messagesTitle}>User Management</h1>
          </div>

          {/* Search */}
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  searchUsers();
                }
              }}
            />
            <button style={styles.searchButton} onClick={searchUsers}>
              Search
            </button>
            <button style={styles.clearButton} onClick={clearSearch}>
              Show All
            </button>
          </div>

          {/* Statistics */}
          <div style={styles.usersStats}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{userStats.total}</div>
              <div style={styles.statLabel}>Total Users</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#f59e0b' }}>{userStats.admins}</div>
              <div style={styles.statLabel}>Admins</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#10b981' }}>{userStats.regular}</div>
              <div style={styles.statLabel}>Created Users</div>
            </div>
          </div>

          {/* Users Grid */}
          {filteredUsers.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>👥</div>
              <div style={styles.emptyTitle}>No users found</div>
              <div>No users match the current search criteria.</div>
            </div>
          ) : (
            <div style={styles.usersGrid}>
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  style={styles.userCard}
                  onClick={() => setSelectedUser(user)}
                  onMouseEnter={(e) => {
                    Object.assign(e.currentTarget.style, styles.userCardHover);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = styles.userCard.boxShadow;
                  }}
                >
                  <div style={styles.userInfo}>
                    <img
                      src={user.profile_image || 'https://res.cloudinary.com/dnnmhrsja/image/upload/v1741780893/user_profiles/may.jpg'}
                      alt={`${user.username}'s avatar`}
                      style={styles.userAvatar}
                      onError={(e) => {
                        e.target.src = 'https://res.cloudinary.com/dnnmhrsja/image/upload/v1741780893/user_profiles/may.jpg';
                      }}
                    />
                    <h3 style={styles.userName}>{user.username}</h3>
                    <p style={styles.userEmail}>{user.email}</p>
                    
                    {(user.username === "managerMay" || user.email === "managerMay") && (
                      <div style={styles.adminBadge}>Admin</div>
                    )}

                    {user.username !== "managerMay" && user.email !== "managerMay" && (
                      <button
                        style={styles.deleteUserButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteUser(user._id);
                        }}
                      >
                        Delete User
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* User Details Modal */}
          {selectedUser && (
            <div style={styles.modal} onClick={() => setSelectedUser(null)}>
              <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                  <h2 style={styles.modalTitle}>User Details</h2>
                  <button
                    style={styles.closeModalButton}
                    onClick={() => setSelectedUser(null)}
                  >
                    ×
                  </button>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={selectedUser.profile_image || 'https://res.cloudinary.com/dnnmhrsja/image/upload/v1741780893/user_profiles/may.jpg'}
                    alt={`${selectedUser.username}'s avatar`}
                    style={{ ...styles.userAvatar, width: '100px', height: '100px', marginBottom: '20px' }}
                    onError={(e) => {
                      e.target.src = 'https://res.cloudinary.com/dnnmhrsja/image/upload/v1741780893/user_profiles/may.jpg';
                    }}
                  />
                  
                  <div style={{ textAlign: 'left' }}>
                    <p><strong>Username:</strong> {selectedUser.username}</p>
                    <p><strong>Email:</strong> {selectedUser.email}</p>
                    <p><strong>User ID:</strong> {selectedUser._id}</p>
                    <p><strong>Account Type:</strong> 
                      {(selectedUser.username === "managerMay" || selectedUser.email === "managerMay") ? (
                        <span style={{ color: '#f59e0b', fontWeight: 'bold' }}> Admin</span>
                      ) : (
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}> Regular User</span>
                      )}
                    </p>
                  </div>

                  {selectedUser.username !== "managerMay" && selectedUser.email !== "managerMay" && (
                    <div style={{ marginTop: '30px' }}>
                      <button
                        style={{ ...styles.deleteUserButton, width: 'auto', padding: '12px 24px' }}
                        onClick={() => deleteUser(selectedUser._id)}
                      >
                        Delete User
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeItem === "Message support") {
      if (messagesLoading) {
        return <div style={styles.loading}>Loading messages...</div>;
      }

      return (
        <div style={styles.messagesContainer}>
          {/* Header */}
          <div style={styles.messagesHeader}>
            <h1 style={styles.messagesTitle}>Support Messages</h1>
            <div style={styles.filterContainer}>
              <label htmlFor="statusFilter">Filter by status:</label>
              <select
                id="statusFilter"
                style={styles.filterSelect}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Messages</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Statistics */}
          <div style={styles.statsContainer}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{messageStats.total}</div>
              <div style={styles.statLabel}>Total Messages</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#f59e0b' }}>{messageStats.pending}</div>
              <div style={styles.statLabel}>Pending</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#10b981' }}>{messageStats.resolved}</div>
              <div style={styles.statLabel}>Resolved</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#ef4444' }}>{messageStats.closed}</div>
              <div style={styles.statLabel}>Closed</div>
            </div>
          </div>

          {/* Messages List */}
          {filteredMessages.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <div style={styles.emptyTitle}>No messages found</div>
              <div>No support messages match the current filter.</div>
            </div>
          ) : (
            <div style={styles.messagesGrid}>
              {filteredMessages.map((message) => (
                <div
                  key={message._id}
                  style={styles.messageCard}
                  onClick={() => setSelectedMessage(message)}
                  onMouseEnter={(e) => {
                    Object.assign(e.currentTarget.style, styles.messageCardHover);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = styles.messageCard.boxShadow;
                  }}
                >
                  <div style={styles.messageHeader}>
                    <div style={styles.messageInfo}>
                      <h3 style={styles.messageName}>{message.name}</h3>
                      <p style={styles.messageEmail}>{message.email}</p>
                      <p style={styles.messageDate}>
                        {formatDate(message.createdAt)}
                      </p>
                    </div>
                    <div style={getStatusStyle(message.status)}>
                      {message.status}
                    </div>
                  </div>
                  
                  <div style={styles.messageContent}>
                    {message.message.length > 150 
                      ? `${message.message.substring(0, 150)}...` 
                      : message.message
                    }
                  </div>

                  <div style={styles.messageActions}>
                    {renderActionButtons(message)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal for viewing full message */}
          {selectedMessage && (
            <div style={styles.modal} onClick={() => setSelectedMessage(null)}>
              <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                  <h2 style={styles.modalTitle}>Message Details</h2>
                  <button
                    style={styles.closeModalButton}
                    onClick={() => setSelectedMessage(null)}
                  >
                    ×
                  </button>
                </div>
                
                <div>
                  <p><strong>Name:</strong> {selectedMessage.name}</p>
                  <p><strong>Email:</strong> {selectedMessage.email}</p>
                  <p><strong>Date:</strong> {formatDate(selectedMessage.createdAt)}</p>
                  <p><strong>Status:</strong> 
                    <span style={getStatusStyle(selectedMessage.status)}>
                      {selectedMessage.status}
                    </span>
                  </p>
                  {selectedMessage.subject && (
                    <p><strong>Subject:</strong> {selectedMessage.subject}</p>
                  )} 
                  <div style={styles.messageLabel}>Message</div>
                  <div style={styles.messageBodyBox}>
                    {selectedMessage.message || selectedMessage.text || '(No content)'}
                  </div>
                  
                  <div style={{ marginTop: 30, display: 'flex', gap: 10 }}>
                    {renderActionButtons(selectedMessage)}
                    <button
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: '#3b82f6',
                        color: '#fff',
                        border: 0,
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEmailModal(selectedMessage);
                      }}
                    >
                      Send Email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Email Modal */}
          {emailModalOpen && selectedMessage && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
              }}
              onClick={() => setEmailModalOpen(false)}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 20,
                  width: 520,
                  maxWidth: '92%',
                  boxShadow: '0 10px 24px rgba(0,0,0,0.12)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>Responding to user {selectedMessage.name}</h3>
                  <button
                    onClick={() => setEmailModalOpen(false)}
                    style={{ background: 'transparent', border: 0, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ marginBottom: 8 }}><strong>To:</strong> {selectedMessage.email}</div>

                <input
                  type="text"
                  placeholder="Subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  style={{
                    width: '100%', padding: 10, borderRadius: 8,
                    border: '1px solid #e5e7eb', marginBottom: 10, outline: 'none'
                  }}
                />

                <textarea
                  placeholder="Write your message…"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  style={{
                    width: '100%', minHeight: 140, padding: 10, borderRadius: 8,
                    border: '1px solid #e5e7eb', outline: 'none', resize: 'vertical'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                  <button
                    onClick={() => setEmailModalOpen(false)}
                    style={{ padding: '10px 14px', borderRadius: 8, background: '#6b7280', color: '#fff', border: 0, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!emailBody.trim() || sendingReply}
                    onClick={() => sendSupportEmail(selectedMessage)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#3b82f6',
                      color: '#fff',
                      border: 0,
                      cursor: 'pointer',
                      opacity: (!emailBody.trim() || sendingReply) ? 0.6 : 1
                    }}
                  >
                    {sendingReply ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeItem === "Trips") {
      const tripsData = dashboardData.topDestinations || [];
      return (
        <>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937' }}>Popular Trips</h1>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            {dashboardData.topDestinations.map(({ name, trips }) => (
              <div key={name} style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>{name}</p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>{trips}</p>
              </div>
            ))}
          </section>
          <section>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', width: '60%', margin: '0 auto' }}>
              <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>Trips per Destination</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={tripsData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="trips" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <aside style={{
        width: '280px',
        backgroundColor: '#fff',
        borderRight: '1px solid #e5e7eb',
        padding: '24px 0'
      }}>
        <div style={{ padding: '0 24px', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Pathmakers</h1>
        </div>
        <nav>
          {sidebarItems.map((item) => (
            <div
              key={item}
              style={{
                padding: '12px 24px',
                cursor: 'pointer',
                backgroundColor: activeItem === item ? '#f3f4f6' : 'transparent',
                borderRight: activeItem === item ? '3px solid #3b82f6' : 'none',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setActiveItem(item)}
              onMouseEnter={(e) => {
                if (activeItem !== item) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseLeave={(e) => {
                if (activeItem !== item) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <p style={{
                fontSize: '16px',
                fontWeight: activeItem === item ? 'bold' : 'normal',
                color: activeItem === item ? '#1f2937' : '#6b7280',
                margin: 0
              }}>{item}</p>
            </div>
          ))}
        </nav>
      </aside>
      
      <main style={{ flex: 1, padding: '32px' }}>
        {/* Status Message */}
        {statusMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              background: statusMessage.type === 'success' ? '#10b981' : '#ef4444',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 'bold',
              zIndex: 10000
            }}
          >
            {statusMessage.text}
          </div>
        )}
        
        {renderContent()}
      </main>
    </div>
  );
};

export default Manager;