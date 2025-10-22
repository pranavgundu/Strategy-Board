// configuration for field dimensions and station positions
export const Config = {
  fieldPNGPixelWidth: 3510,
  fieldPNGPixelHeight: 1610,

  fieldRealWidthInches: 690.875,
  fieldRealHeightInches: 317,

  redOneStationX: 3575,
  redOneStationY: 1155,

  redTwoStationX: 3575,
  redTwoStationY: 805,

  redThreeStationX: 3575,
  redThreeStationY: 455,

  blueOneStationX: -65,
  blueOneStationY: 455,

  blueTwoStationX: -65,
  blueTwoStationY: 805,

  blueThreeStationX: -65,
  blueThreeStationY: 1155,

  sharedTBAApiKey: import.meta.env.VITE_TBA_API_KEY || "",
};
