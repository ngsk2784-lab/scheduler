"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Employee, Report, Schedule } from "@/lib/types";
import * as api from "@/lib/supabase";

interface DataContextValue {
  employees: Employee[];
  schedules: Schedule[];
  reports: Report[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveEmployee: (input: api.EmployeeInput, id?: string) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;
  saveSchedule: (input: api.ScheduleInput, id?: string) => Promise<void>;
  removeSchedule: (id: string) => Promise<void>;
  saveReport: (input: api.ReportInput, id?: string) => Promise<void>;
  removeReport: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [emp, sch, rep] = await Promise.all([
        api.fetchEmployees(),
        api.fetchSchedules(),
        api.fetchReports(),
      ]);
      setEmployees(emp);
      setSchedules(sch);
      setReports(rep);
    } catch (e) {
      console.error(e);
      setError(
        "데이터를 불러오는 데 실패했습니다. Supabase 연결 설정(.env.local)을 확인해 주세요."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveEmployee = useCallback(
    async (input: api.EmployeeInput, id?: string) => {
      await api.saveEmployee(input, id);
      await refresh();
    },
    [refresh]
  );

  const removeEmployee = useCallback(
    async (id: string) => {
      await api.deleteEmployee(id);
      await refresh();
    },
    [refresh]
  );

  const saveSchedule = useCallback(
    async (input: api.ScheduleInput, id?: string) => {
      await api.saveSchedule(input, id);
      await refresh();
    },
    [refresh]
  );

  const removeSchedule = useCallback(
    async (id: string) => {
      await api.deleteSchedule(id);
      await refresh();
    },
    [refresh]
  );

  const saveReport = useCallback(
    async (input: api.ReportInput, id?: string) => {
      await api.saveReport(input, id);
      await refresh();
    },
    [refresh]
  );

  const removeReport = useCallback(
    async (id: string) => {
      await api.deleteReport(id);
      await refresh();
    },
    [refresh]
  );

  return (
    <DataContext.Provider
      value={{
        employees,
        schedules,
        reports,
        loading,
        error,
        refresh,
        saveEmployee,
        removeEmployee,
        saveSchedule,
        removeSchedule,
        saveReport,
        removeReport,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
