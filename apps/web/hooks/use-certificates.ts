'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type CertificateStatus = 'borrador' | 'emitido' | 'anulado';

export interface CertificateClient {
  id: string;
  name: string;
  cuit: string;
}

export interface CertificateCommodity {
  id: string;
  name: string;
  code: string;
}

export interface CertificateLabSample {
  id: string;
  sampleNumber: string;
  grade?: string;
  status?: string;
}

export interface QualityCertificate {
  id: string;
  certificateNumber: string;
  labSampleId: string;
  scaleTicketId?: string;
  clientId: string;
  commodityId: string;
  // Quality snapshot
  humidityPct?: number;
  proteinPct?: number;
  oilPct?: number;
  testWeightKgHl?: number;
  impuritiesPct?: number;
  damagedGrainsPct?: number;
  foreignMatterPct?: number;
  grade?: string;
  netAdjustmentPct?: number;
  // Weights
  grossWeightKg?: number;
  netWeightKg?: number;
  // Metadata
  issueDate: string;
  validUntil?: string;
  issuedBy?: string;
  issuerName?: string;
  qrToken?: string;
  status: CertificateStatus;
  notes?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  client?: CertificateClient;
  commodity?: CertificateCommodity;
  labSample?: CertificateLabSample;
}

export interface CertificatesResponse {
  data: QualityCertificate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CertificateFilters {
  clientId?: string;
  commodityId?: string;
  status?: CertificateStatus | '';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CreateCertificateInput {
  labSampleId: string;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Hook: listar certificados con filtros
// -----------------------------------------------------------------------------

export function useCertificates(filters?: CertificateFilters) {
  return useQuery<CertificatesResponse>({
    queryKey: ['certificates', filters],
    queryFn: () =>
      api.get<CertificatesResponse>('/lab/certificates', {
        params: {
          clientId: filters?.clientId || undefined,
          commodityId: filters?.commodityId || undefined,
          status: filters?.status || undefined,
          dateFrom: filters?.dateFrom || undefined,
          dateTo: filters?.dateTo || undefined,
          page: filters?.page,
          limit: filters?.limit,
        },
      }),
    staleTime: 30_000,
  });
}

// -----------------------------------------------------------------------------
// Hook: detalle de un certificado
// -----------------------------------------------------------------------------

export function useCertificate(id: string | null) {
  return useQuery<QualityCertificate>({
    queryKey: ['certificates', id],
    queryFn: () => api.get<QualityCertificate>(`/lab/certificates/${id!}`),
    enabled: !!id,
  });
}

// -----------------------------------------------------------------------------
// Hook: emitir certificado
// -----------------------------------------------------------------------------

export function useCreateCertificate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCertificateInput) =>
      api.post<QualityCertificate>('/lab/certificates', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['certificates'] });
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: revocar certificado
// -----------------------------------------------------------------------------

export function useRevokeCertificate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<QualityCertificate>(`/lab/certificates/${id}/revoke`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['certificates'] });
    },
  });
}
