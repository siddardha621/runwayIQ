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
import {
  fetchMerchants,
  fetchMerchantSummary,
  fetchCashflow,
  fetchForecast,
  fetchAnomalies,
  fetchObligations,
  simulateScenario,
  evaluateDecision,
  queryCopilot,
  fetchDataQuality,
} from './services/api';

export default function App() {
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState('merch_urbancart');
  const [activeTab, setActiveTab] = useState('decision'); // 'decision', 'overview', 'simulator'
  const [summary, setSummary] = useState(null);
  const [cashflow, setCashflow] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [obligations, setObligations] = useState([]);
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
      const [sumData, cfData, fcData, anomData, obData, dqData] = await Promise.all([
        fetchMerchantSummary(merchantId),
        fetchCashflow(merchantId),
        fetchForecast(merchantId, 30),
        fetchAnomalies(merchantId),
        fetchObligations(merchantId),
        fetchDataQuality(merchantId),
      ]);

      setSummary(sumData);
      setCashflow(cfData);
      setForecast(fcData);
      setAnomalies(anomData);
      setObligations(obData);
      setDataQuality(dqData);

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

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 flex-1">
        
        {/* Header with 3 Simple Navigation Tabs & Store Selector */}
        <Header
          merchants={merchants}
          selectedMerchantId={selectedMerchantId}
          onSelectMerchant={setSelectedMerchantId}
          onRefresh={() => loadMerchantData(selectedMerchantId)}
          loading={loading}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenUpload={() => setIsUploadModalOpen(true)}
        />

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm">
            <strong>Connection Notice:</strong> {error}
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
              <ObligationsTable obligations={obligations} />
            </div>
          </div>
        )}

        {/* TAB 2: CASH FLOW & BILLS (Visual Trends & Schedule) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <ForecastChart
              historicalEntries={cashflow?.entries || []}
              forecastPoints={forecast?.points || []}
              scenarioTrajectory={scenarioResult?.trajectory || []}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ObligationsTable obligations={obligations} />
              <RiskRadar anomaliesData={anomalies} />
            </div>
          </div>
        )}

        {/* TAB 3: WHAT-IF SIMULATOR & AI COPILOT */}
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

      {/* Data Quality Transparency Modal */}
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
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p>Merchant Cash-Flow Decision Intelligence System • Razorpay Bangalore Internship Submission</p>
        <p className="mt-1 text-[11px] text-slate-600">
          Clean Fintech UI/UX • Asymmetric Risk Optimization • Zero Hallucination Guarantee
        </p>
      </footer>
    </div>
  );
}
