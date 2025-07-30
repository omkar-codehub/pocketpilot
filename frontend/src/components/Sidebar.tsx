import React from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
import { Fragment, useState, useEffect, useRef } from 'react';
import { Dialog, Transition, Switch } from '@headlessui/react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  HomeIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  CalculatorIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3Icon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { ChevronUpIcon } from '@heroicons/react/20/solid';

interface SidebarProps {
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
}

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Transactions', href: '/transactions', icon: CreditCardIcon },
  { name: 'Savings', href: '/savings', icon: BanknotesIcon },

  { name: 'Affordability Simulator', href: '/simulator', icon: CalculatorIcon },
  { name: 'Regret Radar', href: '/regret-radar', icon: ExclamationTriangleIcon },

];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [roundUpSavingsEnabled, setRoundUpSavingsEnabled] = useState(false);

    const handleToggleRoundupSavings = async () => {
      try {
        console.log('hello');
        
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found.');
          return;
        }
        const response = await axios.put(
          `${API_BASE_URL}/api/user/round-up-preference`,
          { roundUpEnabled: !roundUpSavingsEnabled },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log(response.data.data.roundUpEnabled);
        setRoundUpSavingsEnabled(response.data.data.roundUpEnabled);
      } catch (error) {
        console.error('Error toggling round-up savings:', error);
      }
    };

    useEffect(() => {
      // Close dropdown if sidebar collapses
      if (collapsed) {
        setIsDropdownOpen(false);
      }
      if (user) {
        setRoundUpSavingsEnabled(user.roundUpEnabled);
      }
    }, [collapsed, user]);

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsDropdownOpen(false);
        }
      }

      if (isDropdownOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      } else {
        document.removeEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isDropdownOpen]);


  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-center">
                <BanknotesIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">PocketPilot</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={() => onToggle(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {collapsed ? (
            <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className="block"
            >
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <item.icon className={`w-6 h-6 relative z-10 ${
                  isActive ? 'text-white' : ''
                }`} />
                
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className={`font-medium relative z-10 ${
                        isActive ? 'text-white' : ''
                      }`}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>

                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-2 w-2 h-2 bg-white rounded-full"
                  />
                )}
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      {/* Profile Dropdown */}
      <div ref={dropdownRef} className="p-4 border-t border-gray-200 dark:border-gray-700 relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-3 px-3 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 w-full"
        >
          <img
            src={user?.avatar || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500"
          />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{user?.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Premium Member</p>
                </div>
                <ChevronUpIcon className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isDropdownOpen && !collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-0 w-full bg-white dark:bg-gray-700 rounded-lg shadow-lg mb-2 p-2"
            >
              <button
                onClick={logout}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 w-full"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span>Logout</span>
              </button>
              <div className="flex items-center justify-between px-3 py-2 text-gray-900 dark:text-white">
                <span>Dark Mode</span>
                <Switch
                  checked={isDark}
                  onChange={toggleTheme}
                  className={`${
                    isDark ? 'bg-emerald-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full`}
                >
                  <span className="sr-only">Enable dark mode</span>
                  <span
                    className={`${
                      isDark ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition`} 
                  />
                </Switch>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-gray-900 dark:text-white">
                <span>Round-up Savings</span>
                <Switch
                    checked={roundUpSavingsEnabled}
                    onChange={handleToggleRoundupSavings}
                    className={`${
                      roundUpSavingsEnabled ? 'bg-teal-600' : 'bg-gray-200'
                    }
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2`}
                  >
                    <span className="sr-only">Enable notifications</span>
                    <span
                      className={`${
                        roundUpSavingsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}