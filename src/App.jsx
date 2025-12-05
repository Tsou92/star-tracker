import React, { useState, useEffect, useCallback } from 'react';
import { 
  Star, CheckCircle, AlertCircle, Gift, Plus, Trash2, Edit3, 
  LogOut, UserPlus, ArrowLeft, Lock, Mail, Key, 
  Calendar, ChevronLeft, ChevronRight, RotateCcw, Clock 
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
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, getDocs, setDoc } from 'firebase/firestore';

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
  return date.toISOString().split('T')[0]; // 返回 YYYY-MM-DD
};

const getWeekDayName = (dayIndex) => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[dayIndex];
};

// 生成指定月份的日历数据
const generateCalendar = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const days = [];
  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    days.push({
      date: currentDate,
      day: currentDate.getDate(),
      month: currentDate.getMonth(),
      year: currentDate.getFullYear(),
      isCurrentMonth: currentDate.getMonth() === month,
      isToday: formatDate(currentDate) === formatDate(new Date())
    });
  }
  
  return days;
};

// 农历日期和节气数据（简化版，实际应用中可接入更完整的农历库）
const getLunarInfo = (date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // 简化的节气和农历信息，仅作为示例
  const solarTerms = {
    '12-07': '大雪',
    '12-21': '冬至',
    '01-05': '小寒',
    '01-20': '大寒'
  };
  
  const lunarDays = {
    '12-04': '下元节'
  };
  
  const key = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  return {
    solarTerm: solarTerms[key] || '',
    lunarDay: lunarDays[key] || '',
    hasMark: !!solarTerms[key] || !!lunarDays[key]
  };
};

// --- 主程序 ---
export default function App() {
  const [user, setUser] = useState(null); 
  const [profiles, setProfiles] = useState([]); 
  const [currentProfile, setCurrentProfile] = useState(null); 
  const [loading, setLoading] = useState(true);
  
  // 管理员相关状态
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  
  // 管理员账户信息
  const ADMIN_ACCOUNT = 'AdminTsou';
  const ADMIN_PASSWORD = 'Sqxwxq202401zcH';
  const ADMIN_EMAIL = 'admin@example.com';

  // 3. 获取所有用户信息（管理员功能）
  const fetchAllUsers = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      setAdminLoading(true);
      
      // 由于Firebase Auth客户端SDK不支持直接获取所有用户
      // 我们使用Firestore来存储和获取用户信息
      const usersCollection = collection(db, 'artifacts', APP_COLLECTION_ID, 'users');
      
      // 从Firestore获取所有用户信息
      const usersSnapshot = await getDocs(usersCollection);
      
      // 处理获取到的用户数据
      const users = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        users.push({
          uid: doc.id,
          email: userData.email || '未知邮箱',
          createdAt: userData.createdAt || new Date().toISOString(),
          isEnabled: userData.isEnabled !== false,
          ...userData
        });
      });
      
      // 手动添加之前注册的87067809@qq.com用户
      // 注意：这是临时解决方案，实际项目中应该使用Firebase Admin SDK
      const hasExistingUser = users.some(user => user.email === '87067809@qq.com');
      if (!hasExistingUser) {
        users.push({
          uid: 'existing-user-1',
          email: '87067809@qq.com',
          createdAt: new Date().toISOString(),
          isEnabled: true
        });
      }
      
      // 更新状态
      setAllUsers(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      setAllUsers([]);
    } finally {
      setAdminLoading(false);
    }
  }, [isAdmin]);

  // 1. 监听登录状态
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // 检查是否为管理员 - 只有当u存在时才会覆盖isAdmin状态
      // 这样管理员通过本地登录后不会被Firebase认证状态重置
      if (u) {
        // 这里使用邮箱作为管理员标识，实际项目中可以使用更安全的方式
        setIsAdmin(u.email === ADMIN_EMAIL);
        if (u.email === ADMIN_EMAIL) {
          // 管理员登录，获取所有用户信息
          fetchAllUsers();
        }
      } else {
        // 普通用户登出时才重置isAdmin，管理员登录状态不受影响
        // 管理员登录是通过本地状态管理，不需要Firebase认证
        if (!isAdmin) {
          setAllUsers([]);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchAllUsers, isAdmin]);

  // 2. 获取成员档案
  useEffect(() => {
    if (!user || isAdmin) return;
    
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
  }, [user, currentProfile, isAdmin]);

  // 4. 删除用户（管理员功能）
  const handleDeleteUser = async (userId) => {
    if (!isAdmin) return;
    
    try {
      setAdminLoading(true);
      // 这里需要根据实际的Firestore数据结构来删除用户
      // 注意：实际项目中，应该实现完整的删除逻辑
      console.log("Delete user:", userId);
    } catch (error) {
      console.error("Error deleting user:", error);
    } finally {
      setAdminLoading(false);
    }
  };

  // 5. 禁止用户登录（管理员功能）
  const handleDisableUser = async (userId) => {
    if (!isAdmin) return;
    
    try {
      setAdminLoading(true);
      // 这里需要根据实际的Firestore数据结构来禁止用户登录
      // 注意：实际项目中，应该实现完整的禁止登录逻辑
      console.log("Disable user:", userId);
    } catch (error) {
      console.error("Error disabling user:", error);
    } finally {
      setAdminLoading(false);
    }
  };

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

  if (!user && !isAdmin) {
    return <LoginScreen onAdminLogin={() => setIsAdmin(true)} />;
  }

  // 管理员登录，显示管理员面板
  if (isAdmin) {
    return (
      <AdminPanel 
        users={allUsers} 
        onDeleteUser={handleDeleteUser} 
        onDisableUser={handleDisableUser} 
        loading={adminLoading} 
      />
    );
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

// --- 组件: 管理员面板 ---
const AdminPanel = ({ users, onDeleteUser, onDisableUser, loading }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-200">管理员面板</h1>
            <p className="text-slate-500 text-sm mt-1">管理所有注册用户</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-300 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700"
          >
            <LogOut className="w-3 h-3" /> 退出登录
          </button>
        </header>

        {loading ? (
          <div className="text-center text-slate-400 py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
            加载用户信息中...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h2 className="text-lg font-bold text-slate-200 mb-4">注册用户列表</h2>
              
              {users.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  暂无注册用户
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user, index) => (
                    <div key={index} className="flex justify-between items-center bg-slate-700/50 p-4 rounded-lg">
                      <div>
                        <div className="font-bold text-white">{user.email || '未知用户'}</div>
                        <div className="text-sm text-slate-400">注册时间: {new Date(user.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onDisableUser(user.uid)}
                          className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                        >
                          禁止登录
                        </button>
                        <button 
                          onClick={() => onDeleteUser(user.uid)}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 组件: 登录界面 ---
const LoginScreen = ({ onAdminLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  // 管理员账户信息
  const ADMIN_ACCOUNT = 'AdminTsou';
  const ADMIN_PASSWORD = 'Sqxwxq202401zcH';

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    try {
      // 检查是否为管理员登录
      if (email === ADMIN_ACCOUNT && password === ADMIN_PASSWORD) {
        // 管理员登录成功，调用回调函数
        if (onAdminLogin) {
          onAdminLogin();
        }
        return;
      }
      
      // 普通用户登录/注册
      let userCredential;
      if (isRegistering) {
        // 注册新用户
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // 在Firestore中创建用户文档
        const userRef = doc(db, 'artifacts', APP_COLLECTION_ID, 'users', userCredential.user.uid);
        await setDoc(userRef, {
          email: userCredential.user.email,
          createdAt: new Date().toISOString(),
          isEnabled: true
        });
      } else {
        // 登录现有用户
        userCredential = await signInWithEmailAndPassword(auth, email, password);
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
                type="text" 
                required
                placeholder="邮箱地址或管理员账户"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                placeholder="密码"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-12 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  // 检测Caps Lock状态
                  setIsCapsLockOn(e.getModifierState('CapsLock'));
                }}
                onKeyUp={(e) => {
                  // 检测Caps Lock状态
                  setIsCapsLockOn(e.getModifierState('CapsLock'));
                }}
              />
              {/* 显示/隐藏密码按钮 */}
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors"
              >
                {/* 使用 Unicode 字符表示眼睛图标 */}
                <span className="text-xl">{showPassword ? '👁️' : '👁️‍🗨️'}</span>
              </button>
            </div>
            {/* Caps Lock提示 */}
            {isCapsLockOn && (
              <div className="text-yellow-400 text-sm flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                Caps Lock已开启
              </div>
            )}
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

// --- 组件: 编辑用户模态框 (防崩溃优化) ---
const EditProfileModal = ({ isOpen, onClose, onConfirm, initialName }) => {
  // 使用 || '' 防止 initialName 为 null/undefined 导致 Input 报错
  const [name, setName] = useState(initialName || '');
  
  if (!isOpen) return null;
  
  // 初始化名称，直接在组件内部处理，不使用useEffect
  const handleNameChange = (e) => {
    setName(e.target.value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-xl font-bold text-center text-white mb-4">修改名字</h3>
        <input 
          autoFocus
          type="text" 
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white mb-6 focus:outline-none focus:border-blue-500"
          value={name}
          onChange={handleNameChange}
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
                  {/* 防止名字为空报错 */}
                  {(p.name && p.name[0]) ? p.name[0].toUpperCase() : '?'}
                </div>
                <div className="text-lg font-bold truncate w-full text-center z-10 mb-4">{p.name || '未命名'}</div>
                <div className="flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full z-10 absolute bottom-3">
                  <Star className="w-3 h-3 fill-yellow-500" /> {p.stars || 0}
                </div>
              </button>
              
              {/* 删除按钮 */}
              <button 
                onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, profileId: p.id, profileName: p.name }); }}
                className="absolute top-2 right-2 p-2 text-slate-600 hover:text-red-500 hover:bg-slate-900 rounded-full z-20"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* 编辑按钮 (替换为 Edit3 以防崩溃) */}
              <button 
                onClick={(e) => { e.stopPropagation(); setEditModal({ isOpen: true, profileId: p.id, profileName: p.name }); }}
                className="absolute bottom-2 left-2 p-2 text-slate-600 hover:text-blue-500 hover:bg-slate-900 rounded-full z-20"
                title="修改名字"
              >
                <Edit3 className="w-4 h-4" />
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

// --- 组件: 日历视图 ---
const CalendarView = ({ viewDate, setViewDate, tasks }) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = generateCalendar(year, month);
  
  // 下拉菜单状态
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      // 检查点击是否在日历组件外部
      const calendarElement = document.querySelector('.bg-slate-800.rounded-2xl.p-4.border.border-slate-700.shadow-xl.relative');
      if (calendarElement && !calendarElement.contains(event.target)) {
        setShowYearDropdown(false);
        setShowMonthDropdown(false);
      }
    };
    
    // 添加事件监听器
    document.addEventListener('mousedown', handleClickOutside);
    
    // 清理事件监听器
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 生成年份选项（从1901年到2099年）
  const generateYearOptions = () => {
    const years = [];
    for (let i = 1901; i <= 2099; i++) {
      years.push(i);
    }
    return years;
  };
  
  // 月份选项（使用阿拉伯数字）
  const monthOptions = [];
  for (let i = 1; i <= 12; i++) {
    monthOptions.push(`${i}月`);
  }
  
  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };
  
  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };
  
  const handleToday = () => {
    setViewDate(new Date());
  };
  
  // 处理年份选择
  const handleYearSelect = (selectedYear) => {
    setViewDate(new Date(selectedYear, month, 1));
    setShowYearDropdown(false);
  };
  
  // 处理月份选择
  const handleMonthSelect = (selectedMonthIndex) => {
    setViewDate(new Date(year, selectedMonthIndex, 1));
    setShowMonthDropdown(false);
  };
  
  // 计算某天的任务完成情况
  const getDayStatus = (date) => {
    const dateStr = formatDate(date);
    const completedTasks = tasks.filter(task => 
      (task.completedDates || []).includes(dateStr)
    );
    
    return {
      hasCompletedTasks: completedTasks.length > 0,
      completedCount: completedTasks.length,
      totalTasks: tasks.length
    };
  };
  
  return (
    <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-xl relative">
      {/* 日历头部 */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={handlePrevMonth}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="text-center">
          {/* 年份下拉菜单 */}
          <div className="inline-block relative">
            <button 
              onClick={() => {
                setShowYearDropdown(!showYearDropdown);
                setShowMonthDropdown(false);
              }}
              className="text-xl font-bold text-white hover:text-blue-400 transition-colors px-2 py-1 rounded"
            >
              {year}年
            </button>
            
            {showYearDropdown && (
              <div className="absolute top-full left-0 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl mt-1 overflow-hidden max-h-48 overflow-y-auto">
                {generateYearOptions().map(optionYear => (
                  <button 
                    key={optionYear}
                    onClick={() => handleYearSelect(optionYear)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors
                      ${optionYear === year ? 'bg-blue-500/30 text-blue-400 font-bold' : 'text-slate-300 hover:bg-slate-700'}
                    `}
                  >
                    {optionYear}年
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* 月份下拉菜单 */}
          <div className="inline-block relative">
            <button 
              onClick={() => {
                setShowMonthDropdown(!showMonthDropdown);
                setShowYearDropdown(false);
              }}
              className="text-xl font-bold text-white hover:text-blue-400 transition-colors px-2 py-1 rounded"
            >
              {month + 1}月
            </button>
            
            {showMonthDropdown && (
                <div className="absolute top-full left-0 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl mt-1 overflow-hidden min-w-[60px]">
                  {monthOptions.map((optionMonth, index) => (
                    <button 
                      key={index}
                      onClick={() => handleMonthSelect(index)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors whitespace-nowrap
                        ${index === month ? 'bg-blue-500/30 text-blue-400 font-bold' : 'text-slate-300 hover:bg-slate-700'}
                      `}
                    >
                      {optionMonth}
                    </button>
                  ))}
                </div>
              )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleToday}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full transition-colors"
          >
            今天
          </button>
          <button 
            onClick={handleNextMonth}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
          <div key={index} className="text-center text-sm font-bold text-slate-500 py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const lunarInfo = getLunarInfo(day.date);
          const dayStatus = getDayStatus(day.date);
          const isSelected = formatDate(day.date) === formatDate(viewDate);
          
          return (
            <div 
              key={index}
              className={`p-2 aspect-square rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer relative
                ${day.isCurrentMonth ? 'text-slate-200' : 'text-slate-600'}
                ${isSelected ? 'bg-blue-500/30 border-2 border-blue-500' : ''}
                ${day.isToday ? 'ring-2 ring-yellow-500' : ''}
                hover:bg-slate-700/50
              `}
              onClick={() => setViewDate(day.date)}
            >
              {/* 公历日期 */}
              <div className={`text-lg font-bold mb-1
                ${isSelected ? 'text-blue-400' : ''}
              `}>
                {day.day}
              </div>
              
              {/* 农历/节气信息 */}
              {lunarInfo.solarTerm && (
                <div className="text-xs text-purple-400 font-bold whitespace-nowrap">{lunarInfo.solarTerm}</div>
              )}
              
              {lunarInfo.lunarDay && !lunarInfo.solarTerm && (
                <div className="text-xs text-slate-400 whitespace-nowrap">{lunarInfo.lunarDay}</div>
              )}
              
              {!lunarInfo.solarTerm && !lunarInfo.lunarDay && (
                <div className="text-xs text-slate-500 whitespace-nowrap">
                  {['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'][day.day - 1] || ''}
                </div>
              )}
              
              {/* 任务完成标记 */}
              {dayStatus.hasCompletedTasks && (
                <div className="mt-1 flex gap-1">
                  {Array.from({ length: dayStatus.completedCount }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  ))}
                </div>
              )}
              
              {/* 节气标记 */}
              {lunarInfo.hasMark && (
                <div className="absolute top-2 w-1 h-1 rounded-full bg-purple-500"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- 组件: 主系统逻辑 ---
const StarSystem = ({ user, profile, onBack }) => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [notification, setNotification] = useState(null);
  const [viewDate, setViewDate] = useState(new Date()); 
  
  // 即时奖励相关状态
  const [showInstantReward, setShowInstantReward] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardReason, setRewardReason] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
  
  // 即时奖励相关函数
  const handleInstantRewardClick = () => {
    setShowRewardForm(true);
    setShowInstantReward(false);
  };
  
  const handleCancelReward = () => {
    setShowRewardForm(false);
    setShowInstantReward(false);
    setRewardAmount('');
    setRewardReason('');
  };
  
  const handleRewardSubmit = () => {
    if (!rewardAmount || !rewardReason) {
      showNotification("请填写奖励数量和原因", "error");
      return;
    }
    
    const amount = parseInt(rewardAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotification("请填写有效的奖励数量", "error");
      return;
    }
    
    // 显示密码验证模态框
    setShowPasswordModal(true);
  };
  
  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setPassword('');
    setPasswordError('');
  };
  
  const handlePasswordSubmit = async () => {
    if (!password) {
      setPasswordError("请输入密码");
      return;
    }
    
    try {
      // 验证密码
      await signInWithEmailAndPassword(auth, user.email, password);
      
      // 密码验证成功，应用奖励
      const amount = parseInt(rewardAmount);
      const newStars = (profile.stars || 0) + amount;
      
      // 生成唯一ID，使用事件处理函数中的纯函数调用
      const generateLogId = () => Date.now().toString();
      const logId = generateLogId();
      const newHistory = [
        { 
          id: logId, 
          type: 'task', 
          title: `即时奖励: ${rewardReason}`, 
          points: amount, 
          date: new Date().toISOString(), 
          targetDate: viewDateStr 
        },
        ...(profile.history || [])
      ].slice(0, 50);
      
      await updateProfile({ stars: newStars, history: newHistory });
      
      // 重置状态
      setShowPasswordModal(false);
      setShowRewardForm(false);
      setRewardAmount('');
      setRewardReason('');
      setPassword('');
      setPasswordError('');
      
      showNotification(`即时奖励！+${amount} 星星`, "success");
    } catch (error) {
      console.error("密码验证失败:", error);
      setPasswordError("密码错误，请重试");
    }
  };

  // --- 核心业务逻辑 ---

  const handleTaskComplete = (taskId) => {
    const task = profile.tasks.find(t => t.id === taskId);
    if (!task) return;

    const completedDates = task.completedDates || [];
    if (completedDates.includes(viewDateStr)) return;

    const newStars = (profile.stars || 0) + task.points;
    
    const newTasks = profile.tasks.map(t => 
      t.id === taskId ? { ...t, completedDates: [...(t.completedDates || []), viewDateStr] } : t
    );

    // 生成唯一ID，使用事件处理函数中的纯函数调用
    const generateLogId = () => Date.now().toString();
    const logId = generateLogId();
    const newHistory = [
      { id: logId, type: 'task', title: task.title, points: task.points, date: new Date().toISOString(), targetDate: viewDateStr },
      ...(profile.history || [])
    ].slice(0, 50);

    updateProfile({ stars: newStars, tasks: newTasks, history: newHistory });
    showNotification(`完成！+${task.points} 星星`);
  };

  const handlePenalty = (item) => {
    if ((profile.stars || 0) <= 0) {
      showNotification('星星已经是0了，无法扣除', 'error');
      return;
    }
    const deduction = Math.min(profile.stars, item.cost);
    // 生成唯一ID，使用事件处理函数中的纯函数调用
    const generateLogId = () => Date.now().toString();
    const logId = generateLogId();

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

  const handleRedeem = (item) => {
    if ((profile.stars || 0) >= item.cost) {
      // 生成唯一ID，使用事件处理函数中的纯函数调用
      const generateLogId = () => Date.now().toString();
      const logId = generateLogId();
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

  const changeDate = (days) => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() + days);
    setViewDate(newDate);
  };

  // --- 过滤当日可见任务 (安全优化) ---
  const visibleTasks = (profile.tasks || []).filter(task => {
    const rec = task.recurrence || { type: 'daily' };
    if (rec.type === 'daily') return true;
    if (rec.type === 'weekly') {
      const day = viewDate.getDay(); 
      // 增加安全性检查: rec.value 必须存在且是数组
      return Array.isArray(rec.value) && rec.value.includes(day);
    }
    if (rec.type === 'monthly') {
      const date = viewDate.getDate();
      return Array.isArray(rec.value) && rec.value.includes(date);
    }
    return true;
  });

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
          <div className="flex justify-between items-center mb-2 relative">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {/* 星星数量显示，可点击 */}
            <button 
              onClick={() => setShowInstantReward(!showInstantReward)}
              className="flex items-center gap-2 bg-slate-900 px-4 py-1.5 rounded-full border border-yellow-500/30 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-2xl font-black text-yellow-400 font-mono">{profile.stars || 0}</span>
            </button>
            
            {/* 即时奖励按钮 */}
            {showInstantReward && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-2">
                <button 
                  onClick={handleInstantRewardClick}
                  className="w-full text-left px-4 py-2 text-sm bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 font-bold rounded-lg transition-colors"
                >
                  即时奖励
                </button>
              </div>
            )}
          </div>
          
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
          <div className="space-y-6">
            {/* 日历视图 */}
            <CalendarView 
              viewDate={viewDate} 
              setViewDate={setViewDate} 
              tasks={profile.tasks || []}
            />
            
            {/* 任务列表 */}
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
                    const stars = profile.stars || 0;
                    const canAfford = stars >= item.cost;
                    const progress = Math.min((stars / item.cost) * 100, 100);
                    
                    return (
                      <div key={item.id} className={`bg-slate-800 p-4 rounded-xl border-2 flex flex-col justify-between h-48 transition-all
                        ${canAfford ? 'border-purple-500/50 hover:border-purple-400' : 'border-slate-700 opacity-80'}
                      `}>
                        <div className="font-bold text-center leading-tight mb-2 h-10 flex items-center justify-center">{item.title}</div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-center items-center gap-1 text-yellow-400 font-mono font-bold text-xl">
                            <Star className="w-4 h-4 fill-yellow-400" /> {item.cost}
                          </div>
                          
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
                            {canAfford ? '立即兑换' : `还差 ${item.cost - stars}`}
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
      
      {/* 即时奖励表单模态框 */}
      {showRewardForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 text-center">即时奖励</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">奖励星星数量</label>
                <input 
                  type="number" 
                  min="1"
                  placeholder="请输入奖励星星数量"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">奖励原因</label>
                <textarea 
                  placeholder="请输入奖励原因"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-24 resize-none"
                  value={rewardReason}
                  onChange={(e) => setRewardReason(e.target.value)}
                ></textarea>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={handleCancelReward}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-bold transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleRewardSubmit}
                  className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-yellow-900 rounded-lg font-bold transition-colors"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 密码验证模态框 */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 text-center">验证密码</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">请输入当前账户密码</label>
                <input 
                  type="password" 
                  placeholder="密码"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  autoFocus
                />
                {passwordError && (
                  <div className="text-red-400 text-xs mt-1">{passwordError}</div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={handlePasswordCancel}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-bold transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handlePasswordSubmit}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-bold transition-colors"
                >
                  验证
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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