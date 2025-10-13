import Axios, { AxiosError, type AxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://0.0.0.0:8080';

export type APIError = {
    status: number;
    error?: string;
    key?: string;
    details?: { key: string; message: string; value?: object }[];
};

const NewRestAPI = (basePath: string) => {
    const method =
        (methodName: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') =>
            async <ResponseType>(path: string, options?: Omit<AxiosRequestConfig, 'url' | 'method'>) => {
                // const token = await retrieveToken();
                if (options === undefined) {
                    options = {};
                }

                options.headers
                    ? (options.headers.X_REQUEST_ID = crypto.randomUUID())
                    : (options.headers = {
                        X_REQUEST_ID: crypto.randomUUID()
                    });

                return Axios.request<ResponseType>({
                    ...options,
                    url: `${API_URL}/${basePath}/${path}`,
                    method: methodName,
                    headers: {
                       // Authorization: `Bearer ${token}`,
                        ...options.headers
                    }
                });
            };

    return {
        get: method('GET'),
        post: method('POST'),
        put: method('PUT'),
        delete: method('DELETE')
    };
};
const ParseErrorToNotify = (
    error: AxiosError<APIError>,
    default_msg = 'Unknown error'
): [string, { type: string }] => {
    if (error.response === undefined) {
        return [default_msg, { type: 'error' }];
    }

    return [
        (error.response.data?.error
            ? error.response.data?.error + error.response.data?.key
            : undefined) ||
        (error.response.data?.details && JSON.stringify(error.response.data?.details)) ||
        default_msg,
        {
            type: (error.response.status || 500) < 500 ? 'warning' : 'error'
        }
    ];
};

export { NewRestAPI, ParseErrorToNotify };