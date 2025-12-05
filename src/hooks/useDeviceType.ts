import { useEffect, useState } from "react";

export type DeviceType = "mobile" | "tablet" | "desktop";

export default function useDeviceType() {
  const [type, setType] = useState<DeviceType>("desktop");

  useEffect(() => {
    const mqMobile = window.matchMedia("(max-width: 767px)");
    const mqTablet = window.matchMedia(
      "(min-width: 768px) and (max-width: 1024px)",
    );
    const mqDesktop = window.matchMedia("(min-width: 1025px)");

    const update = () => {
      if (mqMobile.matches) setType("mobile");
      else if (mqTablet.matches) setType("tablet");
      else setType("desktop");
    };

    update();

    mqMobile.addEventListener("change", update);
    mqTablet.addEventListener("change", update);
    mqDesktop.addEventListener("change", update);
    window.addEventListener("orientationchange", update);

    return () => {
      mqMobile.removeEventListener("change", update);
      mqTablet.removeEventListener("change", update);
      mqDesktop.removeEventListener("change", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return {
    type,
    isMobile: type === "mobile",
    isTablet: type === "tablet",
    isDesktop: type === "desktop",
  };
}
