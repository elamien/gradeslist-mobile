/**
 * EXPERIMENTAL TEST COMPONENT
 * 
 * This component provides manual testing for the experimental direct Gradescope client.
 * Use this to test WebView session cookies with direct API calls.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { runDirectClientExperiment } from '../integrations/gradescope/experimental-direct-client';

interface ExperimentResult {
  connectionWorks: boolean;
  coursesFound: boolean;
  courseData?: any;
}

export default function ExperimentalGradescopeTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ExperimentResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runExperiment = async () => {
    setIsRunning(true);
    setResults(null);
    setLogs([]);
    
    addLog('🧪 Starting Direct Client Experiment...');
    
    try {
      const experimentResults = await runDirectClientExperiment();
      setResults(experimentResults);
      
      addLog('✅ Experiment completed successfully');
      addLog(`Connection works: ${experimentResults.connectionWorks}`);
      addLog(`Courses found: ${experimentResults.coursesFound}`);
      
      if (experimentResults.courseData) {
        addLog(`Course data: ${JSON.stringify(experimentResults.courseData)}`);
      }
      
    } catch (error) {
      addLog(`❌ Experiment failed: ${error}`);
      console.error('[ExperimentTest] Error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Experimental Direct Client Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isRunning && styles.buttonDisabled]}
        onPress={runExperiment}
        disabled={isRunning}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Running Experiment...' : 'Run Direct Client Test'}
        </Text>
      </TouchableOpacity>
      
      {results && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>📊 Results:</Text>
          <Text style={[styles.result, results.connectionWorks ? styles.success : styles.failure]}>
            Connection: {results.connectionWorks ? '✅ Works' : '❌ Failed'}
          </Text>
          <Text style={[styles.result, results.coursesFound ? styles.success : styles.failure]}>
            Courses: {results.coursesFound ? '✅ Found' : '❌ Not Found'}
          </Text>
        </View>
      )}
      
      <ScrollView style={styles.logsContainer}>
        <Text style={styles.logsTitle}>📝 Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logEntry}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  resultsContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  result: {
    fontSize: 14,
    marginBottom: 4,
  },
  success: {
    color: '#28a745',
  },
  failure: {
    color: '#dc3545',
  },
  logsContainer: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logEntry: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
    color: '#333',
  },
});

