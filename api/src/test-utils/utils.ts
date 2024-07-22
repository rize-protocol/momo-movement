import { AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse } from 'axios';

export const mockConfig = {
  url: '',
  method: 'get',
  headers: {} as AxiosRequestHeaders,
};

export function makeMockAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: mockConfig as AxiosRequestConfig,
  } as AxiosResponse<T>;
}
