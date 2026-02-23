"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TVNoise from "@/components/ui/tv-noise";
import type { WidgetData } from "@/types/dashboard";
import Image from "next/image";

interface WidgetProps {
  widgetData: WidgetData;
}

export default function Widget({ widgetData }: WidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<string>("Detecting...");
  const [timezone, setTimezone] = useState<string>("UTC");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Get timezone from browser
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(tz.split("/")[1] || tz);

    // Get user location via geolocation API
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode using open-source API
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            
            // Extract city or location name
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.county ||
              data.address?.state ||
              "Unknown";
            const country = data.address?.country || "";
            
            setLocation(`${city}, ${country}`);
          } catch {
            setLocation("Location Unknown");
          }
        },
        () => {
          setLocation("Permission Denied");
        }
      );
    }
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    const dayOfWeek = date.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const restOfDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return { dayOfWeek, restOfDate };
  };

  const dateInfo = formatDate(currentTime);

  return (
    <Card className="w-full aspect-[2] relative overflow-hidden">
      <TVNoise opacity={0.3} intensity={0.2} speed={40} />
      <CardContent className="bg-accent/30 flex-1 flex flex-col justify-between text-sm font-medium uppercase relative z-20">
        <div className="flex justify-between items-center">
          <span className="opacity-50">{dateInfo.dayOfWeek}</span>
          <span>{dateInfo.restOfDate}</span>
        </div>
        <div className="text-center">
          <div className="text-5xl font-display" suppressHydrationWarning>
            {formatTime(currentTime)}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="opacity-50">GATEWAY MONITORING</span>
          <span>{location}</span>

          <Badge variant="secondary" className="bg-accent">
            {timezone}
          </Badge>
        </div>

        <div className="absolute inset-0 -z-[1]">
          <Image
            src="/assets/pc_blueprint.gif"
            alt="logo"
            width={250}
            height={250}
            className="size-full object-contain"
          />
        </div>
      </CardContent>
    </Card>
  );
}
