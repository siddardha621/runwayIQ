import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import KpiRibbon from './components/KpiRibbon';
import ForecastChart from './components/ForecastChart';
import RiskRadar from './components/RiskRadar';
import ObligationsTable from './components/ObligationsTable';
import ScenarioSimulator from './components/ScenarioSimulator';
import DecisionCenter from './components/DecisionCenter';
import CopilotChat from './components/CopilotChat';
import DataQualityModal from './components/DataQualityModal';
import UploadStatementModal from './components/UploadStatementModal';
import StatementHistory from './components/StatementHistory';
import LoginPage from './components/LoginPage';
import {
  fetchMerchants,
  fetchMerchantSummary,
  fetchCashflow,
  fetchForecast,
  fetchAnomalies,
  fetchObligations,
  createObligation,
  updateObligation,
  deleteObligation,
  simulateScenario,
  evaluateDecision,
  queryCopilot,
  fetchDataQuality,
  fetchStatementHistory,
} from './services/api';

export default function App() {
  // Login page always comes first on initial visit/load
  const [currentUser, setCurrentUser] = useState(null);

  const [merchants, setMerchants] = useState([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState('merch_urbancart');
  const [activeTab, setActiveTab] = useState('decision'); // 'decision', 'statement', 'overview', 'simulator'
  const [summary, setSummary] = useState(null);
  const [cashflow, setCashflow] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [obligations, setObligations] = useState([]);
  const [statementData, setStatementData] = useState(null);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [decisionResult, setDecisionResult] = useState(null);
  const [dataQuality, setDataQuality] = useState(null);
  const [isDqModalOpen, setIsDqModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial Load: Fetch Merchants List
  useEffect(() => {
    async function loadMerchants() {
      try {
        const list = await fetchMerchants();
        setMerchants(list);
        if (list.length > 0) {
          const hasUrban = list.some((m) => m.merchant_id === 'merch_urbancart');
          setSelectedMerchantId(hasUrban ? 'merch_urbancart' : list[0].merchant_id);
        }
      } catch (err) {
        console.error('Error fetching merchants:', err);
        setError('Could not connect to backend server. Please verify FastAPI is running on port 8000.');
      }
    }
    loadMerchants();
  }, []);

  // Fetch all data for selected merchant
  const loadMerchantData = async (merchantId) => {
    setLoading(true);
    setError(null);
    setScenarioResult(null);
    setDecisionResult(null);
    try {
      const [sumData, cfData, fcData, anomData, obData, dqData, stmtData] = await Promise.all([
        fetchMerchantSummary(merchantId),
        fetchCashflow(merchantId),
        fetchForecast(merchantId, 30),
        fetchAnomalies(merchantId),
        fetchObligations(merchantId),
        fetchDataQuality(merchantId),
        fetchStatementHistory(merchantId),
      ]);

      setSummary(sumData);
      setCashflow(cfData);
      setForecast(fcData);
      setAnomalies(anomData);
      setObligations(obData);
      setDataQuality(dqData);
      setStatementData(stmtData);

      // Pre-evaluate default ₹2,00,000 commitment for UrbanCart demo
      if (merchantId === 'merch_urbancart') {
        const initialDec = await evaluateDecision(merchantId, {
          amount: 200000,
          category: 'INVENTORY',
        });
        setDecisionResult(initialDec);
      }
    } catch (err) {
      console.error('Error loading merchant details:', err);
      setError(err.message || 'Failed to load merchant financial records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMerchantId) {
      loadMerchantData(selectedMerchantId);
    }
  }, [selectedMerchantId]);

  // Handler: Run Scenario Simulation
  const handleRunScenario = async (params) => {
    try {
      setLoading(true);
      const res = await simulateScenario(selectedMerchantId, params);
      setScenarioResult(res);
    } catch (err) {
      console.error('Scenario error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetScenario = () => {
    setScenarioResult(null);
  };

  // Handler: Evaluate Financial Decision
  const handleEvaluateDecision = async (params) => {
    try {
      setLoading(true);
      const res = await evaluateDecision(selectedMerchantId, params);
      setDecisionResult(res);
    } catch (err) {
      console.error('Decision evaluation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handlers: Manage Scheduled Obligations (Bills, Salaries, Taxes)
  const handleAddObligation = async (obData) => {
    try {
      setLoading(true);
      await createObligation(selectedMerchantId, obData);
      await loadMerchantData(selectedMerchantId);
    } catch (err) {
      console.error('Error adding obligation:', err);
      alert(err.message || 'Failed to add bill');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateObligation = async (obId, obData) => {
    try {
      setLoading(true);
      await updateObligation(selectedMerchantId, obId, obData);
      await loadMerchantData(selectedMerchantId);
    } catch (err) {
      console.error('Error updating obligation:', err);
      alert(err.message || 'Failed to update bill');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteObligation = async (obId) => {
    try {
      setLoading(true);
      await deleteObligation(selectedMerchantId, obId);
      await loadMerchantData(selectedMerchantId);
    } catch (err) {
      console.error('Error deleting obligation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handler: Query AI Copilot
  const handleAskCopilot = async (question) => {
    const userMsg = { role: 'user', text: question };
    setChatHistory((prev) => [...prev, userMsg]);
    try {
      setLoading(true);
      const res = await queryCopilot(selectedMerchantId, question);
      const botMsg = {
        role: 'assistant',
        text: res.response_text,
        evidence: res.grounded_evidence,
      };
      setChatHistory((prev) => [...prev, botMsg]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', text: 'Apologies, unable to complete query. Please check backend connection.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user.merchant_id) {
      setSelectedMerchantId(user.merchant_id);
      loadMerchantData(user.merchant_id);
    }
    localStorage.setItem('runwayiq_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('runwayiq_user');
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} merchants={merchants} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 flex-1">
        
        {/* Header with Navigation Tabs, Store Selector & User Profile */}
        <Header
          merchants={merchants}
          selectedMerchantId={selectedMerchantId}
          onSelectMerchant={setSelectedMerchantId}
          onRefresh={() => loadMerchantData(selectedMerchantId)}
          loading={loading}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* 4 Clean Key Metrics Cards */}
        <KpiRibbon
          summary={summary}
          onOpenDataQuality={() => setIsDqModalOpen(true)}
        />

        {/* TAB 1: DECISION CHECK (The Main Hero Feature) */}
        {activeTab === 'decision' && (
          <div className="space-y-6">
            <DecisionCenter
              onEvaluate={handleEvaluateDecision}
              decisionResult={decisionResult}
              loading={loading}
            />

            {/* Quick Context Strip */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RiskRadar anomaliesData={anomalies} />
              <ObligationsTable
                obligations={obligations}
                onAddObligation={handleAddObligation}
                onUpdateObligation={handleUpdateObligation}
                onDeleteObligation={handleDeleteObligation}
              />
            </div>
          </div>
        )}

        {/* TAB 2: STATEMENT & TRANSACTIONS HISTORY */}
        {activeTab === 'statement' && (
          <StatementHistory
            statementData={statementData}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            loading={loading}
          />
        )}

        {/* TAB 3: CASH FLOW & BILLS (Visual Trends & Schedule) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <ForecastChart
              historicalEntries={cashflow?.entries || []}
              forecastPoints={forecast?.points || []}
              scenarioTrajectory={scenarioResult?.trajectory || []}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ObligationsTable
                obligations={obligations}
                onAddObligation={handleAddObligation}
                onUpdateObligation={handleUpdateObligation}
                onDeleteObligation={handleDeleteObligation}
              />
              <RiskRadar anomaliesData={anomalies} />
            </div>
          </div>
        )}

        {/* TAB 4: WHAT-IF SIMULATOR & AI COPILOT */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <ForecastChart
              historicalEntries={cashflow?.entries || []}
              forecastPoints={forecast?.points || []}
              scenarioTrajectory={scenarioResult?.trajectory || []}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ScenarioSimulator
                onRunScenario={handleRunScenario}
                onResetScenario={handleResetScenario}
                scenarioResult={scenarioResult}
                loading={loading}
              />
              <CopilotChat
                onAskCopilot={handleAskCopilot}
                chatHistory={chatHistory}
                loading={loading}
              />
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
      <DataQualityModal
        isOpen={isDqModalOpen}
        onClose={() => setIsDqModalOpen(false)}
        dataQuality={dataQuality}
      />

      {/* Upload Statement Modal */}
      <UploadStatementModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        merchantId={selectedMerchantId}
        onUploadSuccess={() => {
          loadMerchantData(selectedMerchantId);
          setActiveTab('statement');
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-sm text-slate-500">
        <p className="font-semibold text-slate-700">RunwayIQ Merchant Cash-Flow Decision Intelligence System</p>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Enterprise Working Capital & Risk Optimization • Zero Hallucination Guarantee
        </p>
      </footer>
    </div>
  );
}
