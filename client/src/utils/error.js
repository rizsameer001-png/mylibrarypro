export const getErrorMessage = (err) =>
  err?.response?.data?.message || err.message || 'Something went wrong';