"use client";

import { useState, useEffect } from "react";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    eachDayOfInterval,
    isEqual,
    parseISO
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Video, Info } from "lucide-react";

interface Event {
    subject: string;
    start: { dateTime: string };
    end: { dateTime: string };
    onlineMeetingUrl?: string;
    bodyPreview?: string;
}

interface MeetingCalendarProps {
    batchFilter?: string;
}

export function MeetingCalendar({ batchFilter }: MeetingCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            const start = startOfMonth(currentMonth).toISOString();
            const end = endOfMonth(currentMonth).toISOString();

            try {
                const res = await fetch(`/api/teams/calendar?startDateTime=${start}&endDateTime=${end}`);
                const data = await res.json();
                if (data.value) {
                    setEvents(data.value);
                }
            } catch (error) {
                console.error("Error fetching calendar events:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [currentMonth]);

    const filteredEvents = batchFilter
        ? events.filter(e => e.subject.toLowerCase().includes(batchFilter.toLowerCase()))
        : events;

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-extrabold text-[#0D121F] font-outfit tracking-tight">
                        {format(currentMonth, "MMMM yyyy")}
                    </h2>
                    <p className="text-slate-400 font-medium text-sm">
                        {batchFilter ? `Schedule for Batch ${batchFilter}` : "General School Schedule"}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-500 hover:text-primary"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(new Date())}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-primary transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-500 hover:text-primary"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return (
            <div className="grid grid-cols-7 mb-4">
                {days.map((day) => (
                    <div key={day} className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const formattedDate = format(day, "d");
                const currentDay = day;
                const dailyEvents = filteredEvents.filter(e => isSameDay(parseISO(e.start.dateTime), currentDay));
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());

                days.push(
                    <div
                        key={day.toString()}
                        className={`relative h-24 p-3 border border-slate-50 transition-all ${!isCurrentMonth ? "bg-slate-50/30 opacity-40" : "bg-white"
                            } ${isSelected ? "ring-2 ring-primary ring-inset z-10" : ""}`}
                        onClick={() => setSelectedDate(currentDay)}
                    >
                        <div className="flex items-center justify-between">
                            <span className={`text-sm font-bold ${isToday ? "h-7 w-7 bg-primary text-white rounded-full flex items-center justify-center -ml-1" :
                                    isSelected ? "text-primary" : "text-slate-600"
                                }`}>
                                {formattedDate}
                            </span>
                        </div>
                        <div className="mt-2 space-y-1 overflow-hidden">
                            {dailyEvents.slice(0, 2).map((event, idx) => (
                                <div
                                    key={idx}
                                    className="text-[10px] bg-primary/5 text-primary-hover px-2 py-1 rounded-lg font-bold truncate border border-primary/10"
                                >
                                    {event.subject}
                                </div>
                            ))}
                            {dailyEvents.length > 2 && (
                                <div className="text-[9px] text-slate-300 font-bold pl-1">
                                    + {dailyEvents.length - 2} more
                                </div>
                            )}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }

        return <div className="rounded-[32px] overflow-hidden border border-slate-100 shadow-sm">{rows}</div>;
    };

    const renderEventDetails = () => {
        const selectedDateEvents = filteredEvents.filter(e => isSameDay(parseISO(e.start.dateTime), selectedDate));

        return (
            <div className="mt-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                        <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-extrabold text-[#0D121F] font-outfit">
                            Details for {format(selectedDate, "MMMM do")}
                        </h3>
                        <p className="text-slate-400 font-medium text-sm">
                            {selectedDateEvents.length} Sessions Scheduled
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selectedDateEvents.map((event, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-primary/5 group-hover:text-primary transition-colors text-slate-400">
                                    <Clock className="h-5 w-5" />
                                </div>
                                {event.onlineMeetingUrl && (
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                                        Teams Meeting
                                    </span>
                                )}
                            </div>
                            <h4 className="text-lg font-bold text-[#0D121F] mb-1 group-hover:text-primary transition-colors">
                                {event.subject}
                            </h4>
                            <p className="text-sm text-slate-400 font-medium mb-6 flex items-center gap-2">
                                {format(parseISO(event.start.dateTime), "h:mm a")} - {format(parseISO(event.end.dateTime), "h:mm a")}
                            </p>

                            {event.onlineMeetingUrl ? (
                                <a
                                    href={event.onlineMeetingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    <Video className="h-4 w-4" />
                                    Join Session
                                </a>
                            ) : (
                                <button className="w-full flex items-center justify-center gap-2 bg-slate-50 text-slate-400 py-3 rounded-2xl font-bold text-sm cursor-not-allowed">
                                    <Info className="h-4 w-4" />
                                    No Link Provided
                                </button>
                            )}
                        </div>
                    ))}
                    {selectedDateEvents.length === 0 && (
                        <div className="col-span-full py-12 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                <Clock className="h-8 w-8 text-slate-200" />
                            </div>
                            <h5 className="text-lg font-bold text-slate-400">No events scheduled</h5>
                            <p className="text-sm text-slate-400 mt-1">Enjoy your free time!</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full">
            {renderHeader()}
            {loading ? (
                <div className="h-[400px] bg-white rounded-[40px] border border-slate-100 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-slate-400 font-bold font-outfit uppercase tracking-widest text-[10px]">Syncing Microsoft Calendar</p>
                    </div>
                </div>
            ) : (
                <>
                    {renderDays()}
                    {renderCells()}
                    {renderEventDetails()}
                </>
            )}
        </div>
    );
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}
