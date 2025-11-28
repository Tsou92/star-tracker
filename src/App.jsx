import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, AlertCircle, Gift, Plus, Trash2, Edit3, Award, LogOut, UserPlus, ArrowLeft, Lock, Mail, Key, AlertTriangle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, setDoc } from 'firebase/firestore';

// ==========================================
// ✅ 这里是您的配置信息 (已填好)
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

// 数据集合名称 (生产环境)
const APP_COLLECTION_ID = 'star-tracker-production'; 

// --- 默认数据模板 ---
const DEFAULT_TASKS = [
  { id: 1, title: '按时起床 (7:00前)', points: 1, type: 'daily', lastCompleted: null },
  { id: 2, title: '完成家庭作业', points: 3, type: 'daily', lastCompleted: null },
  { id: 3, title: '练习钢琴 30分钟', points: 5, type: 'daily', lastCompleted: null },
];

const DEFAULT_PENALTIES = [
  { id: 101, title: '发脾气/大喊大叫', cost: 5 },
  { id: 102, title: '不收拾玩具', cost: 2 },
];

const DEFAULT_REWARDS = [
  { id: 201, title: '看动画片 30分钟', cost: 10 },
  { id: 202, title: '吃冰淇淋', cost: 15 },
];

// --- 主程序 ---
export default function App() {
  const [user, setUser] = useState(null); // 登录的家长/管理员账号
  const [profiles, setProfiles] = useState([]); // 家庭成员列表
  const [currentProfile, setCurrentProfile] = useState(null); // 当前选中的成员
  const [loading, setLoading] = useState(true);

  // 1. 监听登录状态
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. 获取成员档案 (仅在已登录时)
  useEffect(() => {
    if (!user) return;
    
    // 路径：artifacts/生产ID/users/用户UID/profiles
    const q = collection(db, 'artifacts', APP_COLLECTION_ID, 'users', user.uid, 'profiles');
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedProfiles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProfiles(loadedProfiles);
      
      // 如果当前正在查看某个档案，实时更新它
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
        createdAt: new Date().toISOString(),
        lastLoginDate: new Date().toDateString() 
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

  const handleSelectProfile = (profile) => {
    const today = new Date().toDateString();
    let updatedTasks = profile.tasks || [];
    let needsUpdate = false;

    // 每日重置逻辑
    if (profile.lastLoginDate !== today) {
        updatedTasks = updatedTasks.map(t => ({ ...t, lastCompleted: null }));
        needsUpdate = true;
    }

    if (needsUpdate) {
        updateDoc(doc(db, 'artifacts', APP_COLLECTION_ID, 'users', user.uid, 'profiles', profile.id), {
            tasks: updatedTasks,
            lastLoginDate: today
        });
        setCurrentProfile({ ...profile, tasks: updatedTasks, lastLoginDate: today });
    } else {
        setCurrentProfile(profile);
    }
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

  // 状态 1: 未登录 (显示登录/注册页)
  if (!user) {
    return <LoginScreen />;
  }

  // 状态 2: 已登录，未选择档案 (显示档案选择页)
  if (!currentProfile) {
    return (
      <ProfileSelector 
        user={user}
        profiles={profiles} 
        onCreate={handleCreateProfile} 
        onSelect={handleSelectProfile}
        onDelete={handleDeleteProfile}
        onLogout={handleLogout}
      />
    );
  }

  // 状态 3: 档案已选择 (显示主系统)
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

// --- 组件: 删除确认模态框 ---
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, profileName }) => {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
        
        {step === 1 ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-center text-white mb-2">删除用户?</h3>
            <p className="text-slate-400 text-center mb-6">
              您确定要删除 <span className="text-white font-bold">{profileName}</span> 吗？
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium text-slate-300 transition-colors">
                取消
              </button>
              <button onClick={() => setStep(2)} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white transition-colors">
                下一步
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-center text-white mb-2">最终确认</h3>
            <p className="text-red-400 text-center mb-6 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/50">
              警告：此操作<span className="font-bold underline">无法撤销</span>。<br/>该用户的所有星星、任务和历史记录都将永久丢失。
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium text-slate-300 transition-colors">
                还是算了
              </button>
              <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white shadow-lg shadow-red-600/20 transition-all active:scale-95">
                确认彻底删除
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- 组件: 档案选择器 ---
const ProfileSelector = ({ user, profiles, onCreate, onSelect, onDelete, onLogout }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, profileId: null, profileName: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newName.trim()) {
      onCreate(newName);
      setNewName('');
      setIsAdding(false);
    }
  };

  const openDeleteModal = (profile) => {
    setDeleteModal({ isOpen: true, profileId: profile.id, profileName: profile.name });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.profileId) {
      await onDelete(deleteModal.profileId);
      setDeleteModal({ isOpen: false, profileId: null, profileName: '' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 p-6">
      <DeleteConfirmModal 
        isOpen={deleteModal.isOpen}
        profileName={deleteModal.profileName}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
      />

      <div className="max-w-md mx-auto">
        <header className="mb-8 flex justify-between items-end">
           <div>
             <h1 className="text-2xl font-bold text-slate-200">谁在赚星星？</h1>
             <p className="text-slate-500 text-sm mt-1">管理员: {user.isAnonymous ? '游客' : (user.email || '已登录')}</p>
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
                className="w-full bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-blue-500 transition-all rounded-xl p-6 flex flex-col items-center gap-3 relative overflow-hidden"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold shadow-lg z-10">
                  {p.name[0].toUpperCase()}
                </div>
                <div className="text-lg font-bold truncate w-full text-center z-10">{p.name}</div>
                <div className="flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full z-10">
                  <Star className="w-3 h-3 fill-yellow-500" /> {p.stars}
                </div>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); openDeleteModal(p); }}
                className="absolute top-2 right-2 p-2 bg-slate-900 text-slate-400 hover:text-red-500 hover:bg-slate-900 border border-slate-700 hover:border-red-500/50 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-20 shadow-lg"
                title="删除用户"
              >
                <Trash2 className="w-4 h-4" />
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

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2000);
  };

  // --- Firestore 同步助手 ---
  const updateProfile = async (updates) => {
    try {
      // 路径必须与 useEffect 中的路径一致
      const ref = doc(db, 'artifacts', APP_COLLECTION_ID, 'users', user.uid, 'profiles', profile.id);
      await updateDoc(ref, updates);
    } catch (e) {
      console.error("Update failed:", e);
      showNotification("保存失败，请检查网络", "error");
    }
  };

  const handleTaskComplete = (taskId) => {
    const task = profile.tasks.find(t => t.id === taskId);
    const today = new Date().toDateString();

    if (task.lastCompleted === today) return;

    const newStars = (profile.stars || 0) + task.points;
    const newTasks = profile.tasks.map(t => 
      t.id === taskId ? { ...t, lastCompleted: today } : t
    );

    updateProfile({ stars: newStars, tasks: newTasks });
    showNotification(`完成任务！+${task.points} 星星`);
  };

  const handlePenalty = (item) => {
    if (profile.stars <= 0) {
      showNotification('星星已经是0了，无法扣除', 'error');
      return;
    }
    const deduction = Math.min(profile.stars, item.cost);
    updateProfile({ stars: profile.stars - deduction });
    showNotification(`扣除星星: -${deduction}`, 'error');
  };

  const handleRedeem = (item) => {
    if (profile.stars >= item.cost) {
      updateProfile({ stars: profile.stars - item.cost });
      showNotification(`兑换成功！消耗 ${item.cost} 星星`);
    } else {
      showNotification(`星星不足！还差 ${item.cost - profile.stars} 颗`, 'error');
    }
  };

  const handleAddItem = (type, item) => {
    const id = Date.now();
    const newItem = { ...item, id };
    
    if (type === 'task') {
      updateProfile({ tasks: [...(profile.tasks || []), { ...newItem, lastCompleted: null, type: 'daily' }] });
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

  // --- 渲染 ---
  const ProgressBar = () => {
    const rewards = profile.rewards || [];
    const stars = profile.stars || 0;
    const nextReward = rewards.filter(r => r.cost > stars).sort((a,b) => a.cost - b.cost)[0];
    const max = nextReward ? nextReward.cost : stars + 20;
    const progress = Math.min((stars / max) * 100, 100);

    return (
      <div className="w-full bg-indigo-900/30 rounded-full h-4 mb-4 overflow-hidden border border-indigo-100/20">
        <div 
          className="bg-yellow-400 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(250,204,21,0.6)]" 
          style={{ width: `${progress}%` }}
        ></div>
        {nextReward && (
          <div className="text-xs text-center text-indigo-200 mt-1">
            目标: {nextReward.title} ({stars}/{nextReward.cost})
          </div>
        )}
      </div>
    );
  };

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
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                {profile.name}的日历
              </h1>
              <div className="text-xs text-slate-400">{new Date().toLocaleDateString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-2xl border border-yellow-500/30 shadow-inner">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400 animate-pulse" />
            <span className="text-3xl font-black text-yellow-400 tracking-wider font-mono">{profile.stars}</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        <ProgressBar />

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400 mb-4">
              <CheckCircle className="w-6 h-6" />
              今日任务
            </h2>
            {(profile.tasks || []).length === 0 && <div className="text-center text-slate-500 py-10">暂无任务</div>}
            {(profile.tasks || []).map(task => {
              const isDone = task.lastCompleted === new Date().toDateString();
              return (
                <div 
                  key={task.id} 
                  className={`p-4 rounded-xl border-2 transition-all duration-300 flex justify-between items-center
                    ${isDone 
                      ? 'bg-slate-800/50 border-emerald-900/30 opacity-60' 
                      : 'bg-slate-800 border-slate-700 hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    }`}
                >
                  <div>
                    <div className={`font-bold text-lg ${isDone ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                      {task.title}
                    </div>
                    <div className="text-sm text-slate-400 flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" /> +{task.points}
                    </div>
                  </div>
                  <button
                    onClick={() => handleTaskComplete(task.id)}
                    disabled={isDone}
                    className={`px-4 py-2 rounded-lg font-bold transition-all transform active:scale-95
                      ${isDone 
                        ? 'bg-emerald-900/20 text-emerald-700 cursor-not-allowed' 
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                      }`}
                  >
                    {isDone ? '已完成' : '完成'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'penalties' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-red-400 mb-4">
              <AlertCircle className="w-6 h-6" />
              需改进
            </h2>
            {(profile.penalties || []).map(item => (
              <div key={item.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center hover:border-red-500 transition-colors">
                <div>
                  <div className="font-bold text-slate-200">{item.title}</div>
                  <div className="text-sm text-red-400 font-mono">-{item.cost} 星星</div>
                </div>
                <button
                  onClick={() => handlePenalty(item)}
                  className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 px-4 py-2 rounded-lg transition-all active:scale-95"
                >
                  记录
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="space-y-4">
             <h2 className="text-xl font-bold flex items-center gap-2 text-purple-400 mb-4">
              <Gift className="w-6 h-6" />
              兑换中心
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(profile.rewards || []).map(item => {
                const canAfford = profile.stars >= item.cost;
                return (
                  <div key={item.id} className={`bg-slate-800 p-4 rounded-xl border-2 flex flex-col justify-between h-40 transition-all
                    ${canAfford ? 'border-purple-500/30 hover:border-purple-400' : 'border-slate-700 opacity-50'}
                  `}>
                    <div className="font-bold text-center text-lg leading-tight mb-2">{item.title}</div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-center items-center gap-1 text-yellow-400 font-mono font-bold text-xl">
                        <Star className="w-4 h-4 fill-yellow-400" /> {item.cost}
                      </div>
                      <button
                        onClick={() => handleRedeem(item)}
                        disabled={!canAfford}
                        className={`w-full py-2 rounded-lg text-sm font-bold transition-transform active:scale-95
                          ${canAfford 
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30' 
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          }`}
                      >
                        {canAfford ? '立即兑换' : '星星不足'}
                      </button>
                    </div>
                  </div>
                );
              })}
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

      <nav className="fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 pb-safe z-40">
        <div className="max-w-md mx-auto flex justify-around items-center h-16">
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckCircle />} label="任务" color="text-emerald-400" />
          <NavButton active={activeTab === 'penalties'} onClick={() => setActiveTab('penalties')} icon={<AlertCircle />} label="记录" color="text-red-400" />
          <NavButton active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} icon={<Gift />} label="兑换" color="text-purple-400" />
          <NavButton active={activeTab === 'manage'} onClick={() => setActiveTab('manage')} icon={<Edit3 />} label="管理" color="text-blue-400" />
        </div>
      </nav>
    </div>
  );
};

// --- 子组件 (保留原样) ---

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

const ManagementPanel = ({ tasks, penalties, rewards, onAdd, onDelete }) => {
  const [section, setSection] = useState('task'); 
  const [newTitle, setNewTitle] = useState('');
  const [newVal, setNewVal] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTitle || !newVal) return;
    const val = parseInt(newVal);
    if (section === 'task') onAdd('task', { title: newTitle, points: val });
    if (section === 'penalty') onAdd('penalty', { title: newTitle, cost: val });
    if (section === 'reward') onAdd('reward', { title: newTitle, cost: val });
    setNewTitle('');
    setNewVal('');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
        <Edit3 className="w-6 h-6" /> 自定义
      </h2>
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl">
        <h3 className="font-bold text-slate-300 mb-3">为当前用户添加项目</h3>
        <div className="flex gap-2 mb-4 bg-slate-900 p-1 rounded-lg">
          <button onClick={() => setSection('task')} className={`flex-1 py-1 text-sm rounded-md ${section==='task' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>任务</button>
          <button onClick={() => setSection('penalty')} className={`flex-1 py-1 text-sm rounded-md ${section==='penalty' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>扣分</button>
          <button onClick={() => setSection('reward')} className={`flex-1 py-1 text-sm rounded-md ${section==='reward' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>奖励</button>
        </div>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <input 
            type="text" 
            placeholder={section === 'task' ? "任务名称" : section === 'penalty' ? "行为名称" : "奖励名称"}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="分值"
              className="w-24 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
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
        <ManageList title="专属任务列表" items={tasks} type="task" onDelete={onDelete} color="text-emerald-400" />
        <ManageList title="专属扣分列表" items={penalties} type="penalty" onDelete={onDelete} color="text-red-400" />
        <ManageList title="专属奖励列表" items={rewards} type="reward" onDelete={onDelete} color="text-purple-400" />
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
          <span className="text-slate-300 text-sm">{item.title}</span>
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