import React, { useState, useEffect } from 'react';
import { 
  Star, CheckCircle, AlertCircle, Gift, Plus, Trash2, Edit3, 
  LogOut, UserPlus, ArrowLeft, Lock, Mail, Key, AlertTriangle, 
  Calendar, ChevronLeft, ChevronRight, RotateCcw, Clock, Pencil 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// ==========================================
// ✅ 配置信息
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCNluK3Dplo0pynvM-tjP4EeKtsUc7UOLs",
  authDomain: "jifenjiangli-sys.firebaseapp.com",
  projectId: "jifenjiangli-sys",
  storageBucket: "jifenjiangli-sys.firebasestorage.app",
  messagingSenderId: "1068802694798",
  appId: "1:1068802694798:web:358c0f29f91c7cb5af73df",
  measurementId: "G-HVW2HBJZLS"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 数据集合名称
const APP_COLLECTION_ID = 'star-tracker-production'; 

// --- 默认数据模板 (升级版，支持循环) ---
const DEFAULT_TASKS = [
  { id: 1, title: '按时起床 (7:00前)', points: 1, recurrence: { type: 'daily' }, completedDates: [] },
  { id: 2, title: '完成家庭作业', points: 3, recurrence: { type: 'daily' }, completedDates: [] },
  { id: 3, title: '钢琴练习 (周一/三/五)', points: 5, recurrence: { type: 'weekly', value: [1, 3, 5] }, completedDates: [] },
];

const DEFAULT_PENALTIES = [
  { id: 101, title: '发脾气/大喊大叫', cost: 5 },
  { id: 102, title: '不收拾玩具', cost: 2 },
];

const DEFAULT_REWARDS = [
  { id: 201, title: '看动画片 30分钟', cost: 10 },
  { id: 202, title: '吃冰淇淋', cost: 15 },
];

// --- 辅助函数 ---
const formatDate = (date) => {
  return date.toISOString().split('T')[0]; // 返回 YYYY-MM-DD
};

const getWeekDayName = (dayIndex) => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[dayIndex];
};

// --- 主程序 ---
export default function App() {
  const [user, setUser] = useState(null); 
  const [profiles, setProfiles] = useState([]); 
  const [currentProfile, setCurrentProfile] = useState(null); 
  const [loading, setLoading] = useState(true);

  // 1. 监听登录状态
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. 获取成员档案
  useEffect(() => {
    if (!user) return;
    
    const q = collection(db, 'artifacts', APP_COLLECTION_ID, 'users', user.uid, 'profiles');
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedProfiles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProfiles(loadedProfiles);
      
      if (currentProfile) {
        const updated = loadedProfiles.find(p => p.id === currentProfile.id);
        if (updated) setCurrentProfile(updated);
      }
    }, (error) => {
      console.error("Error fetching profiles:", error);
    });

    return () => unsubscribe();
  }, [user, currentProfile?.id]);

  // --- 逻辑处理 ---

  const handleCreateProfile = async (name) => {
    if (!user || !name.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', APP_COLLECTION_ID, 'users', user.uid, 'profiles'), {
        name: name,
        stars: 0,
        tasks: DEFAULT_TASKS,
        penalties: DEFAULT_PENALTIES,
        rewards: DEFAULT_REWARDS,
        history: [], // 新增历史记录字段
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Error adding profile:", e);
      alert("创建失败，请检查网络或权限");
    }
  };

  const handleDeleteProfile = async (profileId) => {
    if (!user) return;
    try {
       await deleteDoc(doc(db, 'artifacts', APP_COLLECTION_ID, 'users', user.uid, 'profiles', profileId));
       if (currentProfile?.id === profileId) setCurrentProfile(null);
    } catch (error) {
       console.error("Deletion failed", error);
    }
  };

  const handleUpdateProfileName = async (profileId, newName) => {
    if (!user || !newName.trim()) return;
    try {
      await updateDoc(doc(db, 'artifacts', APP_COLLECTION_ID, 'users', user.uid, 'profiles', profileId), {
        name: newName
      });
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const handleSelectProfile = (profile) => {
    setCurrentProfile(profile);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentProfile(null);
  };

  // --- 渲染流程控制 ---

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
        加载中...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!currentProfile) {
    return (
      <ProfileSelector 
        user={user}
        profiles={profiles} 
        onCreate={handleCreateProfile} 
        onSelect={handleSelectProfile}
        onDelete={handleDeleteProfile}
        onUpdateName={handleUpdateProfileName}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <StarSystem 
      user={user}
      profile={currentProfile} 
      onBack={() => setCurrentProfile(null)}
    />
  );
}

// --- 组件: 登录界面 ---
const LoginScreen = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      let msg = '操作失败，请重试';
      if (err.code === 'auth/invalid-email') msg = '邮箱格式不正确';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') msg = '账号或密码错误';
      if (err.code === 'auth/email-already-in-use') msg = '该邮箱已被注册';
      if (err.code === 'auth/weak-password') msg = '密码太弱（至少6位）';
      setError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setAuthLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error(err);
      setError('游客登录失败');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-50">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 max-w-sm w-full">
        <div className="bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">比乐时成长系统</h1>
        <p className="text-slate-400 mb-8 text-sm text-center">请登录以同步您的云端数据</p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input 
                type="email" 
                required
                placeholder="邮箱地址"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input 
                type="password" 
                required
                placeholder="密码"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded-lg">{error}</div>}

          <button 
            type="submit" 
            disabled={authLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold py-3 rounded-lg transition-all active:scale-95 flex justify-center items-center"
          >
            {authLoading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div> : (isRegistering ? '注册账号' : '登录系统')}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 text-sm text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {isRegistering ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-800 px-2 text-slate-500">或</span></div>
          </div>
          <button 
            onClick={handleGuestLogin}
            className="text-emerald-500 hover:text-emerald-400 font-medium"
          >
            游客试用 (数据可能会丢失)
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 组件: 编辑用户模态框 ---
const EditProfileModal = ({ isOpen, onClose, onConfirm, initialName }) => {
  const [name, setName] = useState(initialName);
  
  useEffect(() => {
    setName(initialName);
  }, [initialName, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-xl font-bold text-center text-white mb-4">修改名字</h3>
        <input 
          autoFocus
          type="text" 
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white mb-6 focus:outline-none focus:border-blue-500"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium text-slate-300">取消</button>
          <button 
            onClick={() => { if(name.trim()) onConfirm(name); }} 
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 组件: 档案选择器 ---
const ProfileSelector = ({ user, profiles, onCreate, onSelect, onDelete, onUpdateName, onLogout }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, profileId: null, profileName: '' });
  const [editModal, setEditModal] = useState({ isOpen: false, profileId: null, profileName: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newName.trim()) {
      onCreate(newName);
      setNewName('');
      setIsAdding(false);
    }
  };

  const handleEditConfirm = (newName) => {
    if (editModal.profileId) {
      onUpdateName(editModal.profileId, newName);
      setEditModal({ isOpen: false, profileId: null, profileName: '' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 p-6">
      {/* 删除确认框 */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-center mb-2">删除用户?</h3>
            <p className="text-slate-400 text-center mb-6">确定删除 {deleteModal.profileName} 吗？所有数据将丢失。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} className="flex-1 py-3 bg-slate-700 rounded-xl">取消</button>
              <button onClick={() => { onDelete(deleteModal.profileId); setDeleteModal({ ...deleteModal, isOpen: false }); }} className="flex-1 py-3 bg-red-600 rounded-xl font-bold">删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑确认框 */}
      <EditProfileModal 
        isOpen={editModal.isOpen}
        initialName={editModal.profileName}
        onClose={() => setEditModal({ ...editModal, isOpen: false })}
        onConfirm={handleEditConfirm}
      />

      <div className="max-w-md mx-auto">
        <header className="mb-8 flex justify-between items-end">
           <div>
             <h1 className="text-2xl font-bold text-slate-200">谁在赚星星？</h1>
             <p className="text-slate-500 text-sm mt-1">管理员: {user.isAnonymous ? '游客' : user.email}</p>
           </div>
           <button onClick={onLogout} className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-300 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
             <LogOut className="w-3 h-3" /> 退出
           </button>
        </header>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {profiles.map(p => (
            <div key={p.id} className="relative group">
              <button 
                onClick={() => onSelect(p)}
                className="w-full bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-blue-500 transition-all rounded-xl p-6 flex flex-col items-center gap-3 relative overflow-hidden h-full"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold shadow-lg z-10">
                  {p.name[0].toUpperCase()}
                </div>
                <div className="text-lg font-bold truncate w-full text-center z-10 mb-4">{p.name}</div>
                <div className="flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full z-10 absolute bottom-3">
                  <Star className="w-3 h-3 fill-yellow-500" /> {p.stars}
                </div>
              </button>
              
              {/* 删除按钮 (右上角) */}
              <button 
                onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, profileId: p.id, profileName: p.name }); }}
                className="absolute top-2 right-2 p-2 text-slate-600 hover:text-red-500 hover:bg-slate-900 rounded-full z-20"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* 编辑按钮 (左下角 - 新增功能) */}
              <button 
                onClick={(e) => { e.stopPropagation(); setEditModal({ isOpen: true, profileId: p.id, profileName: p.name }); }}
                className="absolute bottom-2 left-2 p-2 text-slate-600 hover:text-blue-500 hover:bg-slate-900 rounded-full z-20"
                title="修改名字"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ))}

          {!isAdding ? (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full bg-slate-800/50 border-2 border-dashed border-slate-700 hover:border-slate-500 text-slate-500 hover:text-slate-300 transition-all rounded-xl p-6 flex flex-col items-center justify-center gap-3 min-h-[160px]"
            >
              <UserPlus className="w-10 h-10 opacity-50" />
              <span className="font-medium">添加用户</span>
            </button>
          ) : (
            <div className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl p-4 flex flex-col justify-center min-h-[160px]">
              <form onSubmit={handleSubmit}>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="输入名字"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white mb-3 text-center focus:outline-none focus:border-blue-500"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-2 text-xs bg-slate-700 rounded-lg hover:bg-slate-600">取消</button>
                  <button type="submit" className="flex-1 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-500">确定</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 组件: 主系统逻辑 ---
const StarSystem = ({ user, profile, onBack }) => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [notification, setNotification] = useState(null);
  const [viewDate, setViewDate] = useState(new Date()); // 当前查看的日历日期

  // 辅助: 格式化 viewDate
  const viewDateStr = formatDate(viewDate);
  const isToday = viewDateStr === formatDate(new Date());

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2000);
  };

  const updateProfile = async (updates) => {
    try {
      const ref = doc(db, 'artifacts', APP_COLLECTION_ID, 'users', user.uid, 'profiles', profile.id);
      await updateDoc(ref, updates);
    } catch (e) {
      console.error("Update failed:", e);
      showNotification("保存失败，请检查网络", "error");
    }
  };

  // --- 核心业务逻辑: 任务/惩罚/撤销 ---

  // 完成任务
  const handleTaskComplete = (taskId) => {
    const task = profile.tasks.find(t => t.id === taskId);
    if (!task) return;

    const completedDates = task.completedDates || [];
    if (completedDates.includes(viewDateStr)) return;

    const newStars = (profile.stars || 0) + task.points;
    
    // 更新任务状态
    const newTasks = profile.tasks.map(t => 
      t.id === taskId ? { ...t, completedDates: [...(t.completedDates || []), viewDateStr] } : t
    );

    // 添加历史记录
    const logId = Date.now().toString();
    const newHistory = [
      { id: logId, type: 'task', title: task.title, points: task.points, date: new Date().toISOString(), targetDate: viewDateStr },
      ...(profile.history || [])
    ].slice(0, 50); // 只保留最近50条

    updateProfile({ stars: newStars, tasks: newTasks, history: newHistory });
    showNotification(`完成！+${task.points} 星星`);
  };

  // 记录惩罚
  const handlePenalty = (item) => {
    if (profile.stars <= 0) {
      showNotification('星星已经是0了，无法扣除', 'error');
      return;
    }
    const deduction = Math.min(profile.stars, item.cost);
    const logId = Date.now().toString();

    const newHistory = [
      { id: logId, type: 'penalty', title: item.title, cost: deduction, date: new Date().toISOString() },
      ...(profile.history || [])
    ].slice(0, 50);

    updateProfile({ 
      stars: profile.stars - deduction,
      history: newHistory
    });
    showNotification(`已记录: -${deduction}`, 'error');
  };

  // 兑换奖励
  const handleRedeem = (item) => {
    if (profile.stars >= item.cost) {
      const logId = Date.now().toString();
      const newHistory = [
        { id: logId, type: 'reward', title: item.title, cost: item.cost, date: new Date().toISOString() },
        ...(profile.history || [])
      ].slice(0, 50);

      updateProfile({ 
        stars: profile.stars - item.cost,
        history: newHistory
      });
      showNotification(`兑换成功！消耗 ${item.cost} 星星`);
    } else {
      showNotification(`星星不足！还差 ${item.cost - profile.stars} 颗`, 'error');
    }
  };

  // 撤销操作 (历史记录通用)
  const handleUndo = (log) => {
    let updates = {};
    const currentHistory = profile.history || [];
    
    // 从历史中移除该条目
    const newHistory = currentHistory.filter(h => h.id !== log.id);
    updates.history = newHistory;

    // 根据类型回滚星星
    if (log.type === 'penalty' || log.type === 'reward') {
      updates.stars = (profile.stars || 0) + log.cost;
    } else if (log.type === 'task') {
      updates.stars = Math.max(0, (profile.stars || 0) - log.points);
      // 如果是任务，还需要移除 completedDate
      if (log.targetDate) {
         const newTasks = profile.tasks.map(t => {
           if (t.title === log.title) { // 简单匹配，理想情况应用ID匹配，但log里为了简单存了title
             return { ...t, completedDates: (t.completedDates || []).filter(d => d !== log.targetDate) };
           }
           return t;
         });
         updates.tasks = newTasks;
      }
    }

    updateProfile(updates);
    showNotification('操作已撤销', 'success');
  };

  // 管理: 添加项目
  const handleAddItem = (type, item) => {
    const id = Date.now();
    // 默认新任务为每日任务
    const newItem = type === 'task' 
      ? { ...item, id, recurrence: item.recurrence || { type: 'daily' }, completedDates: [] }
      : { ...item, id };
    
    if (type === 'task') {
      updateProfile({ tasks: [...(profile.tasks || []), newItem] });
    } else if (type === 'penalty') {
      updateProfile({ penalties: [...(profile.penalties || []), newItem] });
    } else if (type === 'reward') {
      updateProfile({ rewards: [...(profile.rewards || []), newItem] });
    }
    showNotification("添加成功");
  };

  const handleDeleteItem = (type, id) => {
    if (type === 'task') updateProfile({ tasks: profile.tasks.filter(t => t.id !== id) });
    if (type === 'penalty') updateProfile({ penalties: profile.penalties.filter(p => p.id !== id) });
    if (type === 'reward') updateProfile({ rewards: profile.rewards.filter(r => r.id !== id) });
  };

  // --- 日历切换逻辑 ---
  const changeDate = (days) => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() + days);
    setViewDate(newDate);
  };

  // --- 过滤当日可见任务 ---
  const visibleTasks = (profile.tasks || []).filter(task => {
    const rec = task.recurrence || { type: 'daily' };
    if (rec.type === 'daily') return true;
    if (rec.type === 'weekly') {
      const day = viewDate.getDay(); // 0-6 (周日-周六)
      // 处理JS周日为0，通常用户习惯1-7
      // 假设 rec.value 存储的是 [1,3,5] 对应 周一,周三,周五. 周日存为0
      return rec.value && rec.value.includes(day);
    }
    if (rec.type === 'monthly') {
      const date = viewDate.getDate();
      return rec.value && rec.value.includes(date);
    }
    return true;
  });

  // --- 渲染 ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans pb-24">
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg font-bold animate-bounce
          ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-yellow-900'}
        `}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10 shadow-lg">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 bg-slate-900 px-4 py-1.5 rounded-full border border-yellow-500/30">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-2xl font-black text-yellow-400 font-mono">{profile.stars}</span>
            </div>
          </div>
          
          {/* 日历导航条 */}
          <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-1">
            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-700 rounded-md text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
            <div className="flex flex-col items-center">
              <span className="font-bold text-slate-200 text-sm">
                {viewDate.getFullYear()}/{viewDate.getMonth() + 1}/{viewDate.getDate()}
              </span>
              <span className="text-xs text-slate-500">
                {isToday ? '今天' : getWeekDayName(viewDate.getDay())}
              </span>
            </div>
            <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-700 rounded-md text-slate-400"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
              <Calendar className="w-5 h-5" />
              {isToday ? '今日待办' : `${viewDate.getMonth()+1}月${viewDate.getDate()}日 待办`}
            </h2>
            
            {visibleTasks.length === 0 && (
              <div className="text-center text-slate-500 py-10 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                今天没有安排任务哦
              </div>
            )}

            {visibleTasks.map(task => {
              const isDone = (task.completedDates || []).includes(viewDateStr);
              return (
                <div 
                  key={task.id} 
                  className={`p-4 rounded-xl border-2 transition-all duration-300 flex justify-between items-center
                    ${isDone 
                      ? 'bg-slate-800/50 border-emerald-900/30 opacity-60' 
                      : 'bg-slate-800 border-slate-700 hover:border-emerald-500'
                    }`}
                >
                  <div>
                    <div className={`font-bold text-lg ${isDone ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                      {task.title}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-yellow-500"><Star className="w-3 h-3" /> +{task.points}</span>
                      {task.recurrence?.type !== 'daily' && (
                        <span className="bg-slate-700 px-1.5 rounded text-[10px] text-slate-300">
                          {task.recurrence.type === 'weekly' ? '每周循环' : '每月循环'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleTaskComplete(task.id)}
                    disabled={isDone}
                    className={`px-4 py-2 rounded-lg font-bold transition-all transform active:scale-95
                      ${isDone 
                        ? 'bg-emerald-900/20 text-emerald-700 cursor-not-allowed' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                      }`}
                  >
                    {isDone ? '完成' : '打卡'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'penalties' && (
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-bold flex items-center gap-2 text-red-400 mb-4">
                <AlertCircle className="w-5 h-5" /> 行为规范
              </h2>
              <div className="grid gap-3">
                {(profile.penalties || []).map(item => (
                  <div key={item.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                    <span className="font-bold text-slate-200">{item.title}</span>
                    <button
                      onClick={() => handlePenalty(item)}
                      className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
                    >
                      记录 -{item.cost}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <HistoryList 
              title="扣分记录" 
              type="penalty" 
              history={profile.history || []} 
              onUndo={handleUndo} 
            />
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="space-y-6">
             <section>
                <h2 className="text-lg font-bold flex items-center gap-2 text-purple-400 mb-4">
                  <Gift className="w-5 h-5" /> 兑换奖励
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {(profile.rewards || []).map(item => {
                    const canAfford = profile.stars >= item.cost;
                    const progress = Math.min((profile.stars / item.cost) * 100, 100);
                    
                    return (
                      <div key={item.id} className={`bg-slate-800 p-4 rounded-xl border-2 flex flex-col justify-between h-48 transition-all
                        ${canAfford ? 'border-purple-500/50 hover:border-purple-400' : 'border-slate-700 opacity-80'}
                      `}>
                        <div className="font-bold text-center leading-tight mb-2 h-10 flex items-center justify-center">{item.title}</div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-center items-center gap-1 text-yellow-400 font-mono font-bold text-xl">
                            <Star className="w-4 h-4 fill-yellow-400" /> {item.cost}
                          </div>
                          
                          {/* 进度条 (新增) */}
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                          </div>

                          <button
                            onClick={() => handleRedeem(item)}
                            disabled={!canAfford}
                            className={`w-full py-2 rounded-lg text-sm font-bold transition-transform active:scale-95
                              ${canAfford 
                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30' 
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                              }`}
                          >
                            {canAfford ? '立即兑换' : `还差 ${item.cost - profile.stars}`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
            </section>

            <HistoryList 
              title="兑换记录" 
              type="reward" 
              history={profile.history || []} 
              onUndo={handleUndo} 
            />
          </div>
        )}

        {activeTab === 'manage' && (
          <ManagementPanel 
            tasks={profile.tasks || []} 
            penalties={profile.penalties || []} 
            rewards={profile.rewards || []}
            onAdd={handleAddItem}
            onDelete={handleDeleteItem}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 pb-safe z-40">
        <div className="max-w-md mx-auto flex justify-around items-center h-16">
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckCircle />} label="日历" color="text-emerald-400" />
          <NavButton active={activeTab === 'penalties'} onClick={() => setActiveTab('penalties')} icon={<AlertCircle />} label="规范" color="text-red-400" />
          <NavButton active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} icon={<Gift />} label="兑换" color="text-purple-400" />
          <NavButton active={activeTab === 'manage'} onClick={() => setActiveTab('manage')} icon={<Edit3 />} label="管理" color="text-blue-400" />
        </div>
      </nav>
    </div>
  );
};

// --- 子组件: 历史记录列表 (新增) ---
const HistoryList = ({ title, type, history, onUndo }) => {
  const filtered = history.filter(h => h.type === type);
  if (filtered.length === 0) return null;

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" /> {title}
      </h3>
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {filtered.map(log => (
          <div key={log.id} className="flex justify-between items-center text-sm">
            <div>
              <div className="text-slate-300">{log.title}</div>
              <div className="text-xs text-slate-500">{new Date(log.date).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-mono font-bold ${type === 'penalty' ? 'text-red-400' : 'text-purple-400'}`}>
                {type === 'penalty' ? `-${log.cost}` : `-${log.cost}`}
              </span>
              <button 
                onClick={() => onUndo(log)}
                className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white rounded-md transition-colors"
                title="撤销此操作"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, color }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center w-full h-full transition-colors
      ${active ? color : 'text-slate-500 hover:text-slate-300'}
    `}
  >
    <div className={`transform transition-transform ${active ? 'scale-110' : ''}`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <span className="text-[10px] font-bold mt-1">{label}</span>
  </button>
);

// --- 管理面板 (升级循环设置) ---
const ManagementPanel = ({ tasks, penalties, rewards, onAdd, onDelete }) => {
  const [section, setSection] = useState('task'); 
  const [newTitle, setNewTitle] = useState('');
  const [newVal, setNewVal] = useState('');
  
  // 循环设置状态
  const [recurType, setRecurType] = useState('daily'); // daily, weekly, monthly
  const [recurDays, setRecurDays] = useState([]); // [1,3,5] for Mon,Wed,Fri

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTitle || !newVal) return;
    const val = parseInt(newVal);
    
    let itemData = { title: newTitle };

    if (section === 'task') {
      itemData.points = val;
      itemData.recurrence = { type: recurType };
      if (recurType !== 'daily') itemData.recurrence.value = recurDays;
      onAdd('task', itemData);
    } else {
      itemData.cost = val;
      onAdd(section === 'penalty' ? 'penalty' : 'reward', itemData);
    }

    setNewTitle('');
    setNewVal('');
    setRecurDays([]);
    setRecurType('daily');
  };

  const toggleDay = (day) => {
    if (recurDays.includes(day)) {
      setRecurDays(recurDays.filter(d => d !== day));
    } else {
      setRecurDays([...recurDays, day]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl">
        <h3 className="font-bold text-slate-300 mb-3">添加项目</h3>
        <div className="flex gap-2 mb-4 bg-slate-900 p-1 rounded-lg">
          <button onClick={() => setSection('task')} className={`flex-1 py-1 text-sm rounded-md ${section==='task' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>任务</button>
          <button onClick={() => setSection('penalty')} className={`flex-1 py-1 text-sm rounded-md ${section==='penalty' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>扣分</button>
          <button onClick={() => setSection('reward')} className={`flex-1 py-1 text-sm rounded-md ${section==='reward' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>奖励</button>
        </div>

        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <input 
            type="text" 
            placeholder="名称"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          
          {/* 任务循环设置 (仅任务可见) */}
          {section === 'task' && (
            <div className="bg-slate-700/50 p-3 rounded-lg space-y-2">
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => setRecurType('daily')} className={`px-2 py-1 rounded ${recurType==='daily' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'}`}>每天</button>
                <button type="button" onClick={() => setRecurType('weekly')} className={`px-2 py-1 rounded ${recurType==='weekly' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'}`}>每周</button>
                <button type="button" onClick={() => setRecurType('monthly')} className={`px-2 py-1 rounded ${recurType==='monthly' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'}`}>每月</button>
              </div>

              {recurType === 'weekly' && (
                <div className="flex justify-between gap-1">
                  {['日','一','二','三','四','五','六'].map((d, idx) => (
                    <button 
                      key={idx} 
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`w-8 h-8 rounded-full text-xs font-bold ${recurDays.includes(idx) ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-400'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {recurType === 'monthly' && (
                <input 
                  type="number" 
                  min="1" max="31"
                  placeholder="几号 (例如 15)"
                  className="w-full bg-slate-600 rounded px-2 py-1 text-sm"
                  onChange={(e) => setRecurDays([parseInt(e.target.value)])}
                />
              )}
            </div>
          )}

          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="分值"
              className="w-24 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
            />
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> 添加
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <ManageList title="当前任务库" items={tasks} type="task" onDelete={onDelete} color="text-emerald-400" />
        <ManageList title="当前扣分项" items={penalties} type="penalty" onDelete={onDelete} color="text-red-400" />
        <ManageList title="当前奖励库" items={rewards} type="reward" onDelete={onDelete} color="text-purple-400" />
      </div>
    </div>
  );
};

const ManageList = ({ title, items, type, onDelete, color }) => (
  <div>
    <h4 className={`font-bold text-sm mb-2 ${color}`}>{title}</h4>
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50">
          <div>
            <span className="text-slate-300 text-sm block">{item.title}</span>
            {type === 'task' && item.recurrence && item.recurrence.type !== 'daily' && (
              <span className="text-[10px] text-slate-500 uppercase">{item.recurrence.type}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
             <span className="text-slate-400 text-xs font-mono">
               {type === 'task' ? `+${item.points}` : `-${item.cost}`}
             </span>
            <button onClick={() => onDelete(type, item.id)} className="text-slate-500 hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      {items.length === 0 && <div className="text-xs text-slate-600 italic">列表为空</div>}
    </div>
  </div>
);