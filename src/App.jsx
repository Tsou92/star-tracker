import React, { useState, useEffect } from 'react';
import { 
  Star, CheckCircle, AlertCircle, Gift, Plus, Trash2, Edit3, 
  LogOut, UserPlus, ArrowLeft, Lock, Mail, Key, 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw, Clock, 
  Settings, X, Menu, LayoutDashboard
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  EmailAuthProvider,
  reauthenticateWithCredential
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

// --- 默认数据模板 ---
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
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
        history: [], 
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
        <h1 className="text-2xl font-bold mb-2 text-center text-white">比乐时成长系统</h1>
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
  const [name, setName] = useState(initialName || '');
  useEffect(() => { setName(initialName || ''); }, [initialName, isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-xl font-bold text-center text-white mb-4">修改名字</h3>
        <input 
          autoFocus type="text" 
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white mb-6 focus:outline-none focus:border-blue-500"
          value={name} onChange={e => setName(e.target.value)}
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium text-slate-300">取消</button>
          <button onClick={() => { if(name.trim()) onConfirm(name); }} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white">保存</button>
        </div>
      </div>
    </div>
  );
};

// --- 组件: 修改星星验证模态框 ---
const EditStarsModal = ({ isOpen, onClose, onConfirm, currentStars, userEmail }) => {
  const [newStars, setNewStars] = useState(currentStars);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setNewStars(currentStars);
    setPassword('');
    setError('');
  }, [currentStars, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!password) { setError("请输入登录密码以验证身份"); return; }
    setIsVerifying(true);
    try {
       const credential = EmailAuthProvider.credential(userEmail, password);
       await reauthenticateWithCredential(getAuth().currentUser, credential);
       onConfirm(parseInt(newStars));
       onClose();
    } catch (err) {
       console.error(err);
       setError("密码错误，验证失败");
    } finally {
       setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">修改星星数量</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="space-y-4">
           <div>
             <label className="text-xs text-slate-400 mb-1 block">当前星星: {currentStars}</label>
             <div className="relative">
                <Star className="absolute left-3 top-3 w-5 h-5 text-yellow-500" />
                <input 
                  type="number" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-yellow-500 font-mono text-lg"
                  value={newStars}
                  onChange={e => setNewStars(e.target.value)}
                />
             </div>
           </div>

           <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-700/50">
             <p className="text-xs text-red-300 mb-2 flex items-center gap-1">
               <Lock className="w-3 h-3"/> 安全验证 (防止误操作)
             </p>
             <input 
                type="password" 
                placeholder="请输入您的登录密码"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={password}
                onChange={e => setPassword(e.target.value)}
             />
             {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
           </div>

           <button 
             onClick={handleConfirm}
             disabled={isVerifying}
             className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-600 rounded-xl font-bold text-white shadow-lg shadow-yellow-600/20"
           >
             {isVerifying ? '验证中...' : '确认修改'}
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
    <div className="min-h-screen bg-slate-900 text-slate-50 p-6 flex flex-col items-center justify-center">
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-center text-white mb-2">删除用户?</h3>
            <p className="text-slate-400 text-center mb-6">确定删除 {deleteModal.profileName} 吗？所有数据将丢失。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} className="flex-1 py-3 bg-slate-700 rounded-xl text-slate-200">取消</button>
              <button onClick={() => { onDelete(deleteModal.profileId); setDeleteModal({ ...deleteModal, isOpen: false }); }} className="flex-1 py-3 bg-red-600 rounded-xl font-bold text-white">删除</button>
            </div>
          </div>
        </div>
      )}

      <EditProfileModal 
        isOpen={editModal.isOpen}
        initialName={editModal.profileName}
        onClose={() => setEditModal({ ...editModal, isOpen: false })}
        onConfirm={handleEditConfirm}
      />

      <div className="w-full max-w-4xl">
        <header className="mb-12 flex justify-between items-end">
           <div>
             <h1 className="text-3xl font-bold text-slate-200">谁在赚星星？</h1>
             <p className="text-slate-500 text-sm mt-1">管理员: {user.isAnonymous ? '游客' : user.email}</p>
           </div>
           <button onClick={onLogout} className="text-sm flex items-center gap-1 text-slate-400 hover:text-white bg-slate-800 px-4 py-2 rounded-full border border-slate-700 hover:bg-slate-700 transition-colors">
             <LogOut className="w-4 h-4" /> 退出
           </button>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {profiles.map(p => (
            <div key={p.id} className="relative group aspect-square">
              <button 
                onClick={() => onSelect(p)}
                className="w-full h-full bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-blue-500 transition-all rounded-2xl p-6 flex flex-col items-center justify-center gap-4 relative overflow-hidden"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold shadow-lg z-10 text-white">
                  {(p.name && p.name[0]) ? p.name[0].toUpperCase() : '?'}
                </div>
                <div className="text-xl font-bold truncate w-full text-center z-10 text-white">{p.name || '未命名'}</div>
                <div className="flex items-center gap-1 text-sm text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-full z-10">
                  <Star className="w-4 h-4 fill-yellow-500" /> {p.stars || 0}
                </div>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, profileId: p.id, profileName: p.name }); }}
                className="absolute top-3 right-3 p-2 text-slate-600 hover:text-red-500 hover:bg-slate-900 rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); setEditModal({ isOpen: true, profileId: p.id, profileName: p.name }); }}
                className="absolute bottom-3 left-3 p-2 text-slate-600 hover:text-blue-500 hover:bg-slate-900 rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                title="修改名字"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            </div>
          ))}

          {!isAdding ? (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full h-full aspect-square bg-slate-800/50 border-2 border-dashed border-slate-700 hover:border-slate-500 text-slate-500 hover:text-slate-300 transition-all rounded-2xl flex flex-col items-center justify-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center transition-colors">
                <UserPlus className="w-8 h-8 opacity-50" />
              </div>
              <span className="font-medium">添加用户</span>
            </button>
          ) : (
            <div className="w-full h-full aspect-square bg-slate-800 border-2 border-slate-600 rounded-2xl p-6 flex flex-col justify-center">
              <form onSubmit={handleSubmit} className="flex flex-col h-full justify-center">
                <h3 className="text-center font-bold text-white mb-4">新用户</h3>
                <input 
                  autoFocus type="text" placeholder="输入名字"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white mb-4 text-center focus:outline-none focus:border-blue-500"
                  value={newName} onChange={e => setNewName(e.target.value)}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-2 text-sm bg-slate-700 rounded-lg hover:bg-slate-600 text-slate-300">取消</button>
                  <button type="submit" className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500">确定</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 组件: 月历视图 ---
const MonthCalendar = ({ viewDate, onChangeDate, hasTasksMap }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(viewDate));

  useEffect(() => {
    setCurrentMonth(new Date(viewDate));
  }, [viewDate]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-11
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay(); 
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = Array(startDayOfWeek).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...days];

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  
  const isSelected = (d) => {
    if (!d) return false;
    const target = new Date(year, month, d);
    return formatDate(target) === formatDate(viewDate);
  };

  const isToday = (d) => {
    if (!d) return false;
    const target = new Date(year, month, d);
    return formatDate(target) === formatDate(new Date());
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-700 rounded"><ChevronLeft className="w-5 h-5 text-slate-400"/></button>
        <div className="font-bold text-lg text-slate-200">
           {year}年 {month + 1}月
        </div>
        <button onClick={handleNextMonth} className="p-1 hover:bg-slate-700 rounded"><ChevronRight className="w-5 h-5 text-slate-400"/></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日','一','二','三','四','五','六'].map(d => (
          <div key={d} className="text-center text-xs text-slate-500 font-bold">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1 content-start">
        {totalSlots.map((d, index) => {
          if (!d) return <div key={index} className="aspect-square"></div>;
          
          const dateStr = formatDate(new Date(year, month, d));
          const hasTask = hasTasksMap[dateStr];

          return (
            <button 
              key={index}
              onClick={() => onChangeDate(new Date(year, month, d))}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all
                ${isSelected(d) ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30' : 'hover:bg-slate-700 text-slate-300'}
                ${isToday(d) && !isSelected(d) ? 'border border-blue-500/50 text-blue-400' : ''}
              `}
            >
              <span className="text-sm">{d}</span>
              {hasTask && !isSelected(d) && (
                <span className="w-1 h-1 bg-yellow-500 rounded-full absolute bottom-1.5"></span>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 flex justify-center border-t border-slate-700 pt-3">
        <button 
          onClick={() => onChangeDate(new Date())}
          className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-full"
        >
          <RotateCcw className="w-3 h-3" /> 回到今天
        </button>
      </div>
    </div>
  );
};

// --- 组件: 主系统逻辑 ---
const StarSystem = ({ user, profile, onBack }) => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [notification, setNotification] = useState(null);
  const [viewDate, setViewDate] = useState(new Date()); 
  const [isStarModalOpen, setIsStarModalOpen] = useState(false);

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

  // ... (业务逻辑函数保持不变，handleTaskComplete, handlePenalty, etc.)
  const handleTaskComplete = (taskId) => {
    const task = profile.tasks.find(t => t.id === taskId);
    if (!task) return;
    const completedDates = task.completedDates || [];
    if (completedDates.includes(viewDateStr)) return;
    const newStars = (profile.stars || 0) + task.points;
    const newTasks = profile.tasks.map(t => 
      t.id === taskId ? { ...t, completedDates: [...(t.completedDates || []), viewDateStr] } : t
    );
    const logId = Date.now().toString();
    const newHistory = [
      { id: logId, type: 'task', title: task.title, points: task.points, date: new Date().toISOString(), targetDate: viewDateStr },
      ...(profile.history || [])
    ].slice(0, 50);
    updateProfile({ stars: newStars, tasks: newTasks, history: newHistory });
    showNotification(`完成！+${task.points} 星星`);
  };

  const handlePenalty = (item) => {
    if ((profile.stars || 0) <= 0) { showNotification('星星已经是0了，无法扣除', 'error'); return; }
    const deduction = Math.min(profile.stars, item.cost);
    const logId = Date.now().toString();
    const newHistory = [
      { id: logId, type: 'penalty', title: item.title, cost: deduction, date: new Date().toISOString() },
      ...(profile.history || [])
    ].slice(0, 50);
    updateProfile({ stars: profile.stars - deduction, history: newHistory });
    showNotification(`已记录: -${deduction}`, 'error');
  };

  const handleRedeem = (item) => {
    if ((profile.stars || 0) >= item.cost) {
      const logId = Date.now().toString();
      const newHistory = [
        { id: logId, type: 'reward', title: item.title, cost: item.cost, date: new Date().toISOString() },
        ...(profile.history || [])
      ].slice(0, 50);
      updateProfile({ stars: profile.stars - item.cost, history: newHistory });
      showNotification(`兑换成功！消耗 ${item.cost} 星星`);
    } else {
      showNotification(`星星不足！还差 ${item.cost - (profile.stars || 0)} 颗`, 'error');
    }
  };

  const handleUndo = (log) => {
    let updates = {};
    const currentHistory = profile.history || [];
    const newHistory = currentHistory.filter(h => h.id !== log.id);
    updates.history = newHistory;
    if (log.type === 'penalty' || log.type === 'reward') {
      updates.stars = (profile.stars || 0) + log.cost;
    } else if (log.type === 'task') {
      updates.stars = Math.max(0, (profile.stars || 0) - log.points);
      if (log.targetDate) {
         const newTasks = profile.tasks.map(t => {
           if (t.title === log.title) { 
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

  const handleAddItem = (type, item) => {
    const id = Date.now();
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

  const handleOverwriteStars = (newVal) => {
    updateProfile({ stars: newVal });
    showNotification("星星数量已修改");
  };

  const visibleTasks = (profile.tasks || []).filter(task => {
    const rec = task.recurrence || { type: 'daily' };
    if (rec.type === 'daily') return true;
    if (rec.type === 'weekly') {
      const day = viewDate.getDay(); 
      return Array.isArray(rec.value) && rec.value.includes(day);
    }
    if (rec.type === 'monthly') {
      const date = viewDate.getDate();
      return Array.isArray(rec.value) && rec.value.includes(date);
    }
    return true;
  });

  // --- 响应式布局组件 ---
  
  // 侧边栏导航 (Desktop)
  const Sidebar = () => (
    <div className="hidden md:flex flex-col w-72 bg-slate-800 border-r border-slate-700 h-screen sticky top-0">
      <div className="p-6 border-b border-slate-700">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" /> 切换用户
        </button>
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold shadow-lg mb-4 text-white">
            {(profile.name && profile.name[0]) ? profile.name[0].toUpperCase() : '?'}
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{profile.name}</h2>
          <button 
            onClick={() => !user.isAnonymous && setIsStarModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-full border border-yellow-500/30 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="text-2xl font-black text-yellow-400 font-mono">{profile.stars || 0}</span>
            {!user.isAnonymous && <Settings className="w-3 h-3 text-slate-600 ml-1" />}
          </button>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <NavButtonDesktop active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CalendarIcon />} label="日历任务" color="text-emerald-400" />
        <NavButtonDesktop active={activeTab === 'penalties'} onClick={() => setActiveTab('penalties')} icon={<AlertCircle />} label="行为规范" color="text-red-400" />
        <NavButtonDesktop active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} icon={<Gift />} label="奖励兑换" color="text-purple-400" />
        <NavButtonDesktop active={activeTab === 'manage'} onClick={() => setActiveTab('manage')} icon={<Edit3 />} label="管理设置" color="text-blue-400" />
      </nav>
      
      <div className="p-4 border-t border-slate-700 text-xs text-center text-slate-500">
        © 2024 比乐时成长系统
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans flex flex-col md:flex-row">
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg font-bold animate-bounce
          ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-yellow-900'}
        `}>
          {notification.message}
        </div>
      )}

      {/* 修改星星模态框 */}
      <EditStarsModal 
        isOpen={isStarModalOpen}
        onClose={() => setIsStarModalOpen(false)}
        onConfirm={handleOverwriteStars}
        currentStars={profile.stars || 0}
        userEmail={user.email}
      />

      {/* 左侧边栏 (仅 Desktop/Tablet 显示) */}
      <Sidebar />

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        
        {/* Mobile Header (仅 Mobile 显示) */}
        <header className="md:hidden bg-slate-800 border-b border-slate-700 sticky top-0 z-10 shadow-lg">
          <div className="px-4 py-3 flex justify-between items-center">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => !user.isAnonymous && setIsStarModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 px-4 py-1.5 rounded-full border border-yellow-500/30 active:scale-95 transition-transform"
            >
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-xl font-black text-yellow-400 font-mono">{profile.stars || 0}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          
          {activeTab === 'tasks' && (
            <div className="h-full flex flex-col gap-6">
              {/* Desktop下采用左右横排布局: 左日历，右任务 */}
              <div className="flex flex-col md:flex-row gap-6 md:h-[calc(100vh-100px)]">
                {/* 日历区域 */}
                <div className="md:w-96 shrink-0">
                   <MonthCalendar viewDate={viewDate} onChangeDate={setViewDate} hasTasksMap={{}} />
                </div>
                
                {/* 任务列表区域 */}
                <div className="flex-1 flex flex-col min-h-0 bg-slate-800/30 rounded-2xl md:p-6 md:border md:border-slate-700/50 md:overflow-y-auto">
                   <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400 mb-6 sticky top-0 bg-slate-900/95 md:bg-transparent p-2 md:p-0 z-10 backdrop-blur-sm">
                    <CalendarIcon className="w-6 h-6" />
                    {isToday ? '今日待办' : `${viewDate.getMonth()+1}月${viewDate.getDate()}日 待办`}
                   </h2>
                  
                   {visibleTasks.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-10 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                      <div className="bg-slate-800 p-4 rounded-full mb-3"><LayoutDashboard className="w-8 h-8 opacity-50"/></div>
                      今天没有安排任务哦
                    </div>
                   )}

                   <div className="space-y-3">
                     {visibleTasks.map(task => {
                      const isDone = (task.completedDates || []).includes(viewDateStr);
                      return (
                        <div 
                          key={task.id} 
                          className={`p-4 rounded-xl border-2 transition-all duration-300 flex justify-between items-center group
                            ${isDone 
                              ? 'bg-slate-800/50 border-emerald-900/30 opacity-60' 
                              : 'bg-slate-800 border-slate-700 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10'
                            }`}
                        >
                          <div>
                            <div className={`font-bold text-lg ${isDone ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                              {task.title}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                              <span className="flex items-center gap-1 text-yellow-500 font-mono"><Star className="w-3 h-3" /> +{task.points}</span>
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
                            className={`px-5 py-2.5 rounded-lg font-bold transition-all transform active:scale-95
                              ${isDone 
                                ? 'bg-emerald-900/20 text-emerald-700 cursor-not-allowed' 
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 group-hover:scale-105'
                              }`}
                          >
                            {isDone ? '完成' : '打卡'}
                          </button>
                        </div>
                      );
                    })}
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'penalties' && (
            <div className="grid md:grid-cols-[1fr_350px] gap-8 items-start">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-red-400 mb-6">
                  <AlertCircle className="w-7 h-7" /> 行为规范
                </h2>
                {/* 响应式网格布局 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(profile.penalties || []).map(item => (
                    <div key={item.id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-between items-start gap-4 hover:border-red-500/50 hover:shadow-lg transition-all">
                      <span className="font-bold text-slate-200 text-lg">{item.title}</span>
                      <button
                        onClick={() => handlePenalty(item)}
                        className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
                      >
                        记录 -{item.cost}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 历史记录侧边栏 (Desktop) */}
              <div className="md:sticky md:top-6">
                 <HistoryList title="近期扣分记录" type="penalty" history={profile.history || []} onUndo={handleUndo} />
              </div>
            </div>
          )}

          {activeTab === 'shop' && (
            <div className="grid md:grid-cols-[1fr_350px] gap-8 items-start">
              <div className="space-y-6">
                 <h2 className="text-2xl font-bold flex items-center gap-2 text-purple-400 mb-6">
                  <Gift className="w-7 h-7" /> 兑换奖励
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(profile.rewards || []).map(item => {
                    const stars = profile.stars || 0;
                    const canAfford = stars >= item.cost;
                    const progress = Math.min((stars / item.cost) * 100, 100);
                    
                    return (
                      <div key={item.id} className={`bg-slate-800 p-5 rounded-2xl border-2 flex flex-col justify-between aspect-[3/4] transition-all hover:scale-105
                        ${canAfford ? 'border-purple-500/50 hover:border-purple-400 hover:shadow-purple-500/20 shadow-lg' : 'border-slate-700 opacity-80'}
                      `}>
                        <div className="font-bold text-center leading-tight h-12 flex items-center justify-center text-lg">{item.title}</div>
                        <div className="space-y-4 w-full">
                          <div className="flex justify-center items-center gap-1 text-yellow-400 font-mono font-bold text-2xl">
                            <Star className="w-5 h-5 fill-yellow-400" /> {item.cost}
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                            <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                          </div>
                          <button
                            onClick={() => handleRedeem(item)}
                            disabled={!canAfford}
                            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95
                              ${canAfford 
                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30' 
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                              }`}
                          >
                            {canAfford ? '立即兑换' : `还差 ${item.cost - stars}`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

               {/* 历史记录侧边栏 (Desktop) */}
               <div className="md:sticky md:top-6">
                 <HistoryList title="近期兑换记录" type="reward" history={profile.history || []} onUndo={handleUndo} />
              </div>
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
      </div>

      {/* Mobile Bottom Nav (仅 Mobile 显示) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 pb-safe z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
        <div className="max-w-md mx-auto flex justify-around items-center h-16">
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CalendarIcon />} label="日历" color="text-emerald-400" />
          <NavButton active={activeTab === 'penalties'} onClick={() => setActiveTab('penalties')} icon={<AlertCircle />} label="规范" color="text-red-400" />
          <NavButton active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} icon={<Gift />} label="兑换" color="text-purple-400" />
          <NavButton active={activeTab === 'manage'} onClick={() => setActiveTab('manage')} icon={<Edit3 />} label="管理" color="text-blue-400" />
        </div>
      </nav>
    </div>
  );
};

// --- 子组件 (样式优化) ---

const HistoryList = ({ title, type, history, onUndo }) => {
  const filtered = history.filter(h => h.type === type);
  if (filtered.length === 0) return null;
  return (
    <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/50 shadow-lg backdrop-blur-md">
      <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider"><Clock className="w-4 h-4" /> {title}</h3>
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {filtered.map(log => (
          <div key={log.id} className="flex justify-between items-center text-sm p-2 hover:bg-slate-700/30 rounded-lg transition-colors">
            <div>
              <div className="text-slate-200 font-medium">{log.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">{new Date(log.date).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-mono font-bold ${type === 'penalty' ? 'text-red-400' : 'text-purple-400'}`}>{`-${log.cost}`}</span>
              <button onClick={() => onUndo(log)} className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white rounded-md transition-colors" title="撤销"><RotateCcw className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Mobile Nav Button
const NavButton = ({ active, onClick, icon, label, color }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${active ? color : 'text-slate-500 hover:text-slate-300'}`}>
    <div className={`transform transition-transform duration-200 ${active ? 'scale-110 -translate-y-1' : ''}`}>{React.cloneElement(icon, { size: 24 })}</div>
    <span className="text-[10px] font-bold mt-1">{label}</span>
  </button>
);

// Desktop Sidebar Nav Button
const NavButtonDesktop = ({ active, onClick, icon, label, color }) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
      ${active ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
    `}
  >
    <div className={`${active ? color : 'text-slate-500'}`}>{React.cloneElement(icon, { size: 20 })}</div>
    <span>{label}</span>
    {active && <div className={`ml-auto w-1.5 h-1.5 rounded-full ${color.replace('text', 'bg')}`}></div>}
  </button>
);

const ManagementPanel = ({ tasks, penalties, rewards, onAdd, onDelete }) => {
  const [section, setSection] = useState('task'); 
  const [newTitle, setNewTitle] = useState('');
  const [newVal, setNewVal] = useState('');
  const [recurType, setRecurType] = useState('daily'); 
  const [recurDays, setRecurDays] = useState([]); 

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
    if (recurDays.includes(day)) { setRecurDays(recurDays.filter(d => d !== day)); } else { setRecurDays([...recurDays, day]); }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <h3 className="font-bold text-slate-200 mb-6 flex items-center gap-2 text-lg"><Plus className="w-5 h-5 text-blue-500"/> 添加新项目</h3>
        <div className="flex gap-2 mb-6 bg-slate-900 p-1.5 rounded-xl">
          <button onClick={() => setSection('task')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${section==='task' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>任务</button>
          <button onClick={() => setSection('penalty')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${section==='penalty' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>扣分</button>
          <button onClick={() => setSection('reward')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${section==='reward' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>奖励</button>
        </div>

        <form onSubmit={handleAdd} className="flex flex-col gap-5">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block ml-1">名称</label>
            <input type="text" placeholder="例如：练习写字" className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:bg-slate-700 transition-colors" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </div>
          
          {section === 'task' && (
            <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-700/50 space-y-3">
              <label className="text-xs text-slate-400 block">循环方式</label>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => setRecurType('daily')} className={`px-3 py-1.5 rounded-lg border transition-all ${recurType==='daily' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-transparent bg-slate-700 text-slate-400'}`}>每天</button>
                <button type="button" onClick={() => setRecurType('weekly')} className={`px-3 py-1.5 rounded-lg border transition-all ${recurType==='weekly' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-transparent bg-slate-700 text-slate-400'}`}>每周</button>
                <button type="button" onClick={() => setRecurType('monthly')} className={`px-3 py-1.5 rounded-lg border transition-all ${recurType==='monthly' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-transparent bg-slate-700 text-slate-400'}`}>每月</button>
              </div>
              {recurType === 'weekly' && (
                <div className="flex justify-between gap-1 mt-2">
                  {['日','一','二','三','四','五','六'].map((d, idx) => (
                    <button key={idx} type="button" onClick={() => toggleDay(idx)} className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${recurDays.includes(idx) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{d}</button>
                  ))}
                </div>
              )}
              {recurType === 'monthly' && (
                <input type="number" min="1" max="31" placeholder="几号 (例如 15)" className="w-full bg-slate-600 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setRecurDays([parseInt(e.target.value)])} />
              )}
            </div>
          )}
          
          <div className="flex gap-4">
             <div className="w-32">
                <label className="text-xs text-slate-400 mb-1.5 block ml-1">{section === 'task' ? '获得星星' : '消耗星星'}</label>
                <input type="number" placeholder="0" className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" value={newVal} onChange={(e) => setNewVal(e.target.value)} />
             </div>
            <div className="flex-1 flex items-end">
              <button type="submit" className="w-full h-[50px] bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"><Plus className="w-5 h-5" /> 立即添加</button>
            </div>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <h3 className="font-bold text-slate-400 flex items-center gap-2"><LayoutDashboard className="w-5 h-5"/> 当前配置库</h3>
        <ManageList title="任务库" items={tasks} type="task" onDelete={onDelete} color="text-emerald-400" />
        <ManageList title="扣分项" items={penalties} type="penalty" onDelete={onDelete} color="text-red-400" />
        <ManageList title="奖励库" items={rewards} type="reward" onDelete={onDelete} color="text-purple-400" />
      </div>
    </div>
  );
};

const ManageList = ({ title, items, type, onDelete, color }) => (
  <div className="bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
    <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${color}`}>{title}</div>
    <div className="divide-y divide-slate-700/50">
      {items.map(item => (
        <div key={item.id} className="flex justify-between items-center px-4 py-3 hover:bg-slate-700/30 transition-colors first:rounded-t-lg last:rounded-b-lg">
          <div>
            <span className="text-slate-300 text-sm font-medium block">{item.title}</span>
            {type === 'task' && item.recurrence && item.recurrence.type !== 'daily' && (<span className="text-[10px] text-slate-500 uppercase bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{item.recurrence.type === 'weekly' ? '每周' : '每月'}</span>)}
          </div>
          <div className="flex items-center gap-4">
             <span className="text-slate-400 text-sm font-mono font-bold bg-slate-800 px-2 py-1 rounded">{type === 'task' ? `+${item.points}` : `-${item.cost}`}</span>
            <button onClick={() => onDelete(type, item.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ))}
      {items.length === 0 && <div className="p-4 text-xs text-slate-600 italic text-center">列表为空</div>}
    </div>
  </div>
);
