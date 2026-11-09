'use client';

import React, { useState } from 'react';
import {
  X,
  Users,
  Wrench,
  Plus,
  Play,
  Copy,
  Check,
  Zap,
  Shield,
  Sparkles,
  Coins,
  Globe,
  MessageSquare,
  Send,
  Upload,
  Download,
  Trash2,
} from 'lucide-react';
import { multiplayerManager, MultiplayerRoom } from '@/lib/multiplayerSystem';
import { getStoredMods, saveActiveMods, saveCustomMods, exportModsToJson, importModsFromJson, GameMod } from '@/lib/modSystem';
import { soundManager } from '@/lib/audio';

interface MultiplayerModLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMultiplayerMatch: (room: MultiplayerRoom) => void;
  skinId: string;
}

export default function MultiplayerModLobbyModal({
  isOpen,
  onClose,
  onStartMultiplayerMatch,
  skinId,
}: MultiplayerModLobbyModalProps) {
  const [activeTab, setActiveTab] = useState<'multiplayer' | 'mods'>('multiplayer');

  // Multiplayer state
  const [playerNameInput, setPlayerNameInput] = useState(multiplayerManager.localPlayerName);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [currentRoom, setCurrentRoom] = useState<MultiplayerRoom | null>(multiplayerManager.currentRoom);
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Modding state
  const [mods, setMods] = useState<GameMod[]>(() => getStoredMods());
  const [importJsonInput, setImportJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showImportBox, setShowImportBox] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportJsonInput(content);
        const res = importModsFromJson(content);
        if (res.success && res.mods) {
          const merged = [...mods, ...res.mods];
          setMods(merged);
          const customOnly = merged.filter((m) => !m.isBuiltIn);
          saveCustomMods(customOnly);
          saveActiveMods(merged);
          setImportStatus(res);
          setShowImportBox(true);
          soundManager.playSpinWin();
        } else {
          setImportStatus(res);
          setShowImportBox(true);
          soundManager.playPelletEat();
        }
      }
    };
    reader.readAsText(file);
  };

  // Register multiplayer listeners
  React.useEffect(() => {
    multiplayerManager.registerListeners({
      onRoomStateChange: (room) => {
        setCurrentRoom(room ? { ...room } : null);
      },
      onChatMessage: () => {
        if (multiplayerManager.currentRoom) {
          setCurrentRoom({ ...multiplayerManager.currentRoom });
        }
      },
      onPlayersUpdate: () => {
        if (multiplayerManager.currentRoom) {
          setCurrentRoom({ ...multiplayerManager.currentRoom });
        }
      },
    });
  }, []);

  if (!isOpen) return null;

  const handleUpdateName = () => {
    multiplayerManager.setPlayerName(playerNameInput);
    soundManager.playCoinCollect();
  };

  const handleCreateRoom = () => {
    const room = multiplayerManager.createRoom(roomNameInput || `${playerNameInput}'s Arena`, 1, skinId);
    setCurrentRoom({ ...room });
    soundManager.playSpinWin();
  };

  const handleJoinRoom = () => {
    if (!roomCodeInput.trim()) return;
    const room = multiplayerManager.joinRoom(roomCodeInput, skinId);
    setCurrentRoom({ ...room });
    soundManager.playSpinWin();
  };

  const handleQuickMatch = async () => {
    const room = await multiplayerManager.quickMatch(skinId);
    setCurrentRoom({ ...room });
    soundManager.playSpinWin();
  };

  const handleLeaveRoom = () => {
    multiplayerManager.leaveRoom();
    setCurrentRoom(null);
    soundManager.playPelletEat();
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    multiplayerManager.sendChatMessage(chatInput);
    setChatInput('');
    if (multiplayerManager.currentRoom) {
      setCurrentRoom({ ...multiplayerManager.currentRoom });
    }
  };

  const handleToggleMod = (modId: string) => {
    const updated = mods.map((m) => (m.id === modId ? { ...m, enabled: !m.enabled } : m));
    setMods(updated);
    saveActiveMods(updated);
    soundManager.playPelletEat();
  };

  const handleDeleteCustomMod = (modId: string) => {
    const updated = mods.filter((m) => m.id !== modId);
    setMods(updated);
    saveActiveMods(updated);
    const customOnly = updated.filter((m) => !m.isBuiltIn);
    saveCustomMods(customOnly);
    soundManager.playPelletEat();
  };

  const handleExportMods = () => {
    const jsonStr = exportModsToJson(mods);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SnakeTycoon_Mods_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportMods = () => {
    setImportStatus(null);
    const res = importModsFromJson(importJsonInput);
    if (res.success && res.mods) {
      const merged = [...mods, ...res.mods];
      setMods(merged);
      const customOnly = merged.filter((m) => !m.isBuiltIn);
      saveCustomMods(customOnly);
      saveActiveMods(merged);
      setImportStatus(res);
      setImportJsonInput('');
      soundManager.playSpinWin();
    } else {
      setImportStatus(res);
      soundManager.playPelletEat();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl border-2 border-slate-700 bg-slate-900 p-6 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('multiplayer')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition ${
                activeTab === 'multiplayer'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>MULTIPLAYER LOBBY</span>
            </button>

            <button
              onClick={() => setActiveTab('mods')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition ${
                activeTab === 'mods'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-slate-950 shadow-lg shadow-purple-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Wrench className="h-4 w-4" />
              <span>MOD MANAGER & STUDIO</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ================================================= */}
        {/* TAB 1: MULTIPLAYER LOBBY & ROOMS                  */}
        {/* ================================================= */}
        {activeTab === 'multiplayer' && (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* Player Profile Settings */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-700 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-500/45 text-cyan-300 font-black">
                  👑
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">My Multiplayer Handle</span>
                  <input
                    type="text"
                    value={playerNameInput}
                    onChange={(e) => setPlayerNameInput(e.target.value)}
                    maxLength={20}
                    className="mt-0.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-black text-white focus:outline-none focus:border-cyan-400 w-48"
                  />
                </div>
              </div>
              <button
                onClick={handleUpdateName}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition shadow"
              >
                Save Name
              </button>
            </div>

            {!currentRoom ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quick Match Card */}
                <div className="flex flex-col justify-between p-5 rounded-2xl border-2 border-emerald-500/50 bg-emerald-950/20 shadow-lg">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-black mb-2">
                      <Globe className="h-3.5 w-3.5" /> FAST MATCHMAKING
                    </div>
                    <h3 className="text-lg font-black text-white">Global Public Match</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Instantly join an active public tournament room with players worldwide.
                    </p>
                  </div>
                  <button
                    onClick={handleQuickMatch}
                    className="mt-6 flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition"
                  >
                    <Play className="h-4 w-4" />
                    <span>QUICK PLAY NOW</span>
                  </button>
                </div>

                {/* Create or Join Custom Room */}
                <div className="flex flex-col justify-between p-5 rounded-2xl border-2 border-cyan-500/50 bg-cyan-950/20 shadow-lg">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-black">
                      <Users className="h-3.5 w-3.5" /> CUSTOM LOBBY
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Room Name</label>
                      <input
                        type="text"
                        placeholder="My Awesome Arena Room"
                        value={roomNameInput}
                        onChange={(e) => setRoomNameInput(e.target.value)}
                        className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button
                      onClick={handleCreateRoom}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-2.5 text-xs font-black text-slate-950 transition shadow"
                    >
                      <Plus className="h-4 w-4" /> Create Room
                    </button>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="CODE"
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value)}
                        className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs font-black text-white text-center uppercase focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={handleJoinRoom}
                        className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-black border border-cyan-500/40 transition"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Active Room LOBBY VIEW */
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between p-4 rounded-2xl border-2 border-cyan-400 bg-cyan-950/30">
                  <div>
                    <span className="text-[10px] font-black text-cyan-400 uppercase">Room Code</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl font-black font-mono text-white tracking-wider">{currentRoom.id}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(currentRoom.id);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
                        title="Copy Room Code"
                      >
                        {copiedCode ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleLeaveRoom}
                      className="px-4 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 text-xs font-black border border-red-500/50 transition"
                    >
                      Leave Room
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onStartMultiplayerMatch(currentRoom);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 text-slate-950 text-sm font-black shadow-lg shadow-emerald-500/30 hover:scale-105 transition flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" /> START MULTIPLAYER MATCH
                    </button>
                  </div>
                </div>

                {/* Players List & Live Chat Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Connected Players */}
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-cyan-400" /> Connected Players ({Object.keys(currentRoom.players).length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {Object.values(currentRoom.players).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="truncate">{p.name}</span>
                            {p.id === multiplayerManager.localPlayerId && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-black">YOU</span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">{p.ping}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Room Chat */}
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-purple-400" /> Room Chat & Emotes
                      </h4>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
                        {currentRoom.chatLog.map((c) => (
                          <div key={c.id} className="text-slate-300 break-words">
                            <span className="font-black text-cyan-400 mr-1.5">{c.senderName}:</span>
                            <span className={c.isSystem ? 'text-amber-400 font-bold italic' : ''}>{c.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <form onSubmit={handleSendChat} className="flex gap-2 mt-3 pt-2 border-t border-slate-800">
                      <input
                        type="text"
                        placeholder="Say something to room..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        maxLength={100}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="submit"
                        className="px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition flex items-center justify-center"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================= */}
        {/* TAB 2: MOD MANAGER & STUDIO                       */}
        {/* ================================================= */}
        {activeTab === 'mods' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-purple-500/40 bg-purple-950/20">
              <div>
                <h3 className="text-sm font-black text-purple-300">Community Mod Studio & Plugins</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Enable gameplay tweaks, weapon abilities, custom physics, and export/import mods instantly.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-slate-100 text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-purple-500/20"
                >
                  <Upload className="h-3.5 w-3.5" /> Import from Computer / Phone (.json)
                </button>
                <button
                  onClick={() => setShowImportBox(!showImportBox)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-black border border-purple-500/40 transition flex items-center gap-1.5"
                >
                  Paste JSON
                </button>
                <button
                  onClick={handleExportMods}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-black border border-cyan-500/40 transition flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Export Mods
                </button>
              </div>
            </div>

            {/* Import JSON Box */}
            {showImportBox && (
              <div className="p-4 rounded-2xl border border-slate-700 bg-slate-950 space-y-2 animate-in fade-in duration-200">
                <span className="text-xs font-black text-slate-200 uppercase">Paste Mod JSON Code</span>
                <textarea
                  rows={4}
                  placeholder='[{"id": "custom_mod", "name": "Super Mod", "config": {"speedMultiplier": 2.0}}]'
                  value={importJsonInput}
                  onChange={(e) => setImportJsonInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-purple-400"
                />
                <div className="flex items-center justify-between">
                  {importStatus && (
                    <span className={`text-xs font-bold ${importStatus.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {importStatus.message}
                    </span>
                  )}
                  <button
                    onClick={handleImportMods}
                    className="ml-auto px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-black transition"
                  >
                    Install Mod Code
                  </button>
                </div>
              </div>
            )}

            {/* Mods List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mods.map((mod) => (
                <div
                  key={mod.id}
                  className={`flex flex-col justify-between p-4 rounded-2xl border-2 transition ${
                    mod.enabled
                      ? 'border-purple-500 bg-purple-950/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 uppercase tracking-wider">
                          {mod.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">v{mod.version}</span>
                      </div>
                      {!mod.isBuiltIn && (
                        <button
                          onClick={() => handleDeleteCustomMod(mod.id)}
                          className="p-1 rounded text-red-400 hover:bg-red-950/50 transition"
                          title="Delete Custom Mod"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <h4 className="text-sm font-black text-white">{mod.name}</h4>
                    <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{mod.description}</p>
                    <span className="text-[10px] text-slate-500 mt-2 block">Author: {mod.author}</span>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80">
                    <span className={`text-xs font-black ${mod.enabled ? 'text-purple-400' : 'text-slate-500'}`}>
                      {mod.enabled ? 'MOD ACTIVE' : 'DISABLED'}
                    </span>
                    <button
                      onClick={() => handleToggleMod(mod.id)}
                      className={`px-4 py-1.5 rounded-xl font-black text-xs transition ${
                        mod.enabled
                          ? 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {mod.enabled ? 'Disable' : 'Enable Mod'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
